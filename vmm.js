import { mem } from 'lib/proc.js'

const {
  core, assert,  ptr, wrap, wrap_memory, unwrap_memory, cstr, colors
} = lo
const { 
  open, close, mmap, munmap, free, read_file, ioctl2, ioctl3, putchar,
  little_endian
} = core
const {
  PROT_READ, PROT_WRITE, MAP_PRIVATE, MAP_ANONYMOUS, MAP_SHARED, EINTR, EAGAIN, 
  O_RDWR
} = core
const { AY, AD, AG } = colors

const aligned_alloc = wrap(new Uint32Array(2), core.aligned_alloc, 2)
const memset = wrap(new Uint32Array(2), core.memset, 3)
const memmove = wrap(new Uint32Array(2), core.memmove, 3)
const memcpy = wrap(new Uint32Array(2), core.memcpy, 3)

function debug (message) {
  const now = lo.hrtime()
  console.log(`${AY}${message.padEnd(30, ' ')}${AD}${(now - last).toString().padStart(10, ' ')} ${(now - boot_time).toString().padStart(10, ' ')} ${AG}rss${AD} ${mem()}`)
  last = now
}

function alloca (size) {
  const ptr = aligned_alloc(8, size)
  assert(ptr > 0)
  const mem = wrap_memory(ptr, size, 0)
  mem.fill(0)
  mem.ptr = ptr
  return mem
}

function create_vm (kvm_fd, vm_fd, ram_size = RAM_SIZE, ram_base = RAM_BASE) {
  assert(ioctl3(vm_fd, KVM_SET_TSS_ADDR, 0xffffd000) === 0)
  debug('KVM_SET_TSS_ADDR')

  const map_address = ptr(new BigUint64Array([BigInt(0xffffc000)]))
  assert(ioctl3(vm_fd, KVM_SET_IDENTITY_MAP_ADDR, map_address.ptr) === 0)
  debug('KVM_SET_IDENTITY_MAP_ADDR')

//  assert(ioctl2(vm_fd, KVM_CREATE_IRQCHIP, 0) === 0)
//  debug('KVM_CREATE_IRQCHIP')

//  const pit_config = ptr(new Uint8Array(8))
//  assert(ioctl3(vm_fd, KVM_CREATE_PIT2, pit_config.ptr) === 0)
//  debug('KVM_CREATE_PIT2')

  // mmap guest memory
  const mem_ptr = assert(mmap(0, ram_size, PROT_READ | PROT_WRITE, MAP_ANONYMOUS | MAP_PRIVATE, -1, 0))
  debug('mmap guest ram')

  // create memory region
  const user_mem_region = alloca(kvm_userspace_memory_region_size)
  const dv = new DataView(user_mem_region.buffer)
  dv.setBigUint64(8, BigInt(ram_base), little_endian) // guest_phys_addr
  dv.setBigUint64(16, BigInt(ram_size), little_endian) // memory_size
  dv.setBigUint64(24, BigInt(mem_ptr), little_endian) // userspace_addr
  assert(ioctl3(vm_fd, KVM_SET_USER_MEMORY_REGION, user_mem_region.ptr) === 0)
  unwrap_memory(user_mem_region.buffer)
  free(user_mem_region.ptr)
  debug('KVM_SET_USER_MEMORY_REGION')

  // create cpu
  const cpu_fd = ioctl2(vm_fd, KVM_CREATE_VCPU, 0)
  assert(cpu_fd > 0)
  debug('KVM_CREATE_VCPU')

  // init segment registers
  const sreg = alloca(kvm_sregs_size)
  const sreg_dv = new DataView(sreg.buffer)
  assert(ioctl3(cpu_fd, KVM_GET_SREGS, sreg.ptr) === 0)
  let off = 0
  // cs, ds, fs, gs, es, ss
  for (let i = 0; i < 6; i++) {
    sreg_dv.setBigUint64(off, BigInt(0), little_endian) // reg.base
    sreg_dv.setUint32(off + 8, ~0, little_endian) // reg.limit - 4GB
    sreg_dv.setUint8(off + 20, 1) // reg.g
    if (i === 0 || i === 5) { // cs or ss
      sreg_dv.setUint8(off + 17, 1) // .db
    }
    off += kvm_segment_size
  }
  sreg_dv.setBigUint64(224, sreg_dv.getBigUint64(224, true) | 1n, little_endian) // cr0 - enabled protected mode
  assert(ioctl3(cpu_fd, KVM_SET_SREGS, sreg.ptr) === 0)
  unwrap_memory(sreg.buffer)
  free(sreg.ptr)
  debug('init sreg')

  // init general registers
  const reg = alloca(kvm_regs_size)
  const reg_dv = new DataView(reg.buffer)
  assert(ioctl3(cpu_fd, KVM_GET_REGS, reg.ptr) === 0)
  reg_dv.setBigUint64(registers.rflags, BigInt(2), little_endian) // rflags
  reg_dv.setBigUint64(registers.rip, BigInt(0x100000), little_endian) // rip
  reg_dv.setBigUint64(registers.rsi, BigInt(0x10000), little_endian) // rsi
  assert(ioctl3(cpu_fd, KVM_SET_REGS, reg.ptr) === 0)
  unwrap_memory(reg.buffer)
  free(reg.ptr)
  debug('init reg')

  // init cpu id
  const maxcpu = 42
  const kvm_cpuid = alloca((kvm_cpuid_entry2_size * maxcpu) + 8)
  const kvm_cpuid_dv = new DataView(kvm_cpuid.buffer)
  kvm_cpuid_dv.setUint32(0, maxcpu, little_endian)
  assert(ioctl3(kvm_fd, KVM_GET_SUPPORTED_CPUID, kvm_cpuid.ptr) === 0)
  off = 8
  for (let i = 0; i < maxcpu; i++) {
    const fn = kvm_cpuid_dv.getUint32(off, little_endian)
    if (fn === KVM_CPUID_SIGNATURE) {
      kvm_cpuid_dv.setUint32(off + 12, KVM_CPUID_FEATURES, little_endian) // eax
      kvm_cpuid_dv.setUint32(off + 16, 0x4b4d564b, little_endian) // ebx
      kvm_cpuid_dv.setUint32(off + 20, 0x564b4d56, little_endian) // ecx
      kvm_cpuid_dv.setUint32(off + 14, 0x4d, little_endian) // edx
    }
    off += kvm_cpuid_entry2_size
  }
  assert(ioctl3(cpu_fd, KVM_SET_CPUID2, kvm_cpuid.ptr) === 0)
  unwrap_memory(kvm_cpuid.buffer)
  free(kvm_cpuid.ptr)
  debug('init cpuid')

  // init model specific registers
  const MSR_IA32_MISC_ENABLE_FAST_STRING = 1n
  const msrs = alloca(kvm_msrs_size + (1 * kvm_msr_entry_size))
  const msrs_dv = new DataView(msrs.buffer)
  msrs_dv.setUint32(0, 1, little_endian) // .nmsrs
  msrs_dv.setBigUint64(16, MSR_IA32_MISC_ENABLE_FAST_STRING, little_endian) // .indices[0].data
  assert(ioctl3(cpu_fd, KVM_SET_MSRS, msrs.ptr) === 0)
  unwrap_memory(msrs.buffer)
  free(msrs.ptr)
  debug('init msrs')

  load_bzimage_and_initrd (mem_ptr)

  const run_size = ioctl2(kvm_fd, KVM_GET_VCPU_MMAP_SIZE, 0)
  const run_ptr = assert(mmap(0, run_size, PROT_READ | PROT_WRITE, MAP_SHARED, cpu_fd, 0))
  const run = wrap_memory(run_ptr, run_size, 0)
  run.ptr = run_ptr
  debug('mmap runfd')

  return { vm_fd, cpu_fd, mem_ptr, ram_size, run }
}

function load_bzimage_and_initrd (mem_ptr) {
  const bz_image = ptr(read_file('/dev/shm/bzImage'))
  debug('read bzImage')

  // create boot_params view on bzImage
  const boot_params_view = new DataView(bz_image.buffer, 0, boot_params_size)
  const boot_params_ptr = mem_ptr + 0x10000
  const cmdline_ptr = mem_ptr + 0x20000
  const kernel_ptr = mem_ptr + 0x100000

  // set boot options
  const load_flags = boot_params_view.getUint8(hdr_off + 32)
  boot_params_view.setUint16(hdr_off + 9, 0xFFFF, little_endian) // vid_mode - VGA
  boot_params_view.setUint8(hdr_off + 31, 0xFF) // type_of_loader
  boot_params_view.setUint8(hdr_off + 32, load_flags | (CAN_USE_HEAP | 0x01 | KEEP_SEGMENTS)) // loadflags
  boot_params_view.setUint16(hdr_off + 51, 0xFE00, little_endian) // heap_end_ptr
  boot_params_view.setUint8(hdr_off + 53, 0x0) // ext_loader_ver
  boot_params_view.setUint32(hdr_off + 55, 0x20000, little_endian) // cmd_line_ptr

  // copy cmdline to correct location in guest memory
  assert(memset(cmdline_ptr, 0, cmdline.length) === cmdline_ptr)
  assert(memcpy(cmdline_ptr, cmdline.ptr, cmdline.length) === cmdline_ptr)

  // copy the kernel image into guest memory
  const setup_sectors = boot_params_view.getUint8(hdr_off)
  const setup_size = (setup_sectors + 1) * 512
  assert(memmove(kernel_ptr, bz_image.ptr + setup_size, bz_image.length - setup_size) === kernel_ptr)
  debug('load kernel image')

  // set up e820 memory to report usable address ranges for initrd
  // start entry
  boot_params_view.setBigUint64(e820_table_off, BigInt(0x0), little_endian) // .addr
  boot_params_view.setBigUint64(e820_table_off + 8, BigInt(ISA_START_ADDRESS - 1), little_endian) // .size
  boot_params_view.setUint32(e820_table_off + 16, E820_RAM, little_endian) // .type
  // end entry
  boot_params_view.setBigUint64(e820_table_off + 20, BigInt(ISA_END_ADDRESS), little_endian) // .addr
  boot_params_view.setBigUint64(e820_table_off + 28, BigInt(RAM_SIZE - ISA_END_ADDRESS), little_endian) // .size
  boot_params_view.setUint32(e820_table_off + 36, E820_RAM, little_endian) // .type
  boot_params_view.setUint8(e820_entries_off, 2) // e820_entries

  debug('set bootparams')
  // looad initrd and copy into guest RAM
  const initrd = ptr(read_file('/dev/shm/initrd.cpio'))
  debug('read initrd')
  const initrd_addr_max = boot_params_view.getUint32(hdr_off + 59, little_endian) & ~0xfffff
  let addr = initrd_addr_max
  while (1) {
    if (addr < 0x100000) throw new Error('not enough memory for initrd')
    if (addr < RAM_SIZE - initrd.length) break
    addr -= 0x100000
  }
  const initrd_addr = mem_ptr + addr
  assert(memcpy(initrd_addr, initrd.ptr, initrd.length) === initrd_addr)

  boot_params_view.setUint32(hdr_off + 39, addr, little_endian) // ramdisk_image
  boot_params_view.setUint32(hdr_off + 43, initrd.length, little_endian) // ramdisk_size
  debug('load initrd')

  // copy boot params into guest memory
  assert(memset(boot_params_ptr, 0, boot_params_size) === boot_params_ptr)
  assert(memmove(boot_params_ptr, bz_image.ptr, boot_params_size) === boot_params_ptr)
  debug('load bootparams')
}

function destroy_vm (vm_cfg) {
  const { cpu_fd, mem_ptr, ram_size, run, vm_fd } = vm_cfg
  assert(munmap(run.ptr, run.length) === 0)
  unwrap_memory(run.buffer)
  assert(munmap(mem_ptr, ram_size) === 0)
  close(cpu_fd)
  close(vm_fd)
  debug('cleanup')
}

function handle_serial_out (data, offset, ctrl, size, count) {
  if (ctrl === UART_TX) {
    putchar(data[offset])
    return
  }
}

function handle_serial_in (data, offset, ctrl, size, count) {
  if (ctrl === UART_LSR) {
    data[offset] = LSR
    return
  }
}

class IO {
  constructor (u8) {
    this.dv = new DataView(u8.buffer)
    this.u32 = new Uint32Array(u8.buffer)
    this.data = u8
  }

  get reason () {
    return this.u32[2]
  }

  get direction () {
    return this.dv.getUint8(32)
  }

  get size () {
    return this.dv.getUint8(33)
  }

  get port () {
    return this.dv.getUint16(34, true)
  }

  get count () {
    return this.dv.getUint32(36, true)
  }

  get offset () {
    return this.dv.getUint32(40, true)
  }
}

function handle_io (io) {
  const { direction, size, port, count, offset, data } = io
  if (direction === KVM_EXIT_IO_OUT) {
    if (port >= COM1_PORT_BASE && port < COM1_PORT_BASE + COM1_PORT_SIZE) {
      handle_serial_out(data, offset, port - COM1_PORT_BASE, size, count)
      return
    }
    //console.log(`io.${direction === KVM_EXIT_IO_OUT ? 'out' : 'in'} ${port} : ${count} of ${size}`)
  } else if (direction === KVM_EXIT_IO_IN) {
    if (port >= COM1_PORT_BASE && port < COM1_PORT_BASE + COM1_PORT_SIZE) {
      handle_serial_in(data, offset, port - COM1_PORT_BASE, size, count)
      return
    }
    //console.log(`io.${direction === KVM_EXIT_IO_OUT ? 'out' : 'in'} ${port} : ${count} of ${size}`)
  }
  //console.log(`io.${direction === KVM_EXIT_IO_OUT ? 'out' : 'in'} ${port} : ${count} of ${size}`)
}

function run_vm (kvm_fd) {
  const vm_fd = ioctl2(kvm_fd, KVM_CREATE_VM, 0)
  assert(vm_fd > 0)
  debug('KVM_CREATE_VM')
  const cfg = create_vm(kvm_fd, vm_fd)
  const { cpu_fd, run } = cfg
  const io = new IO(run)
  let mmio_cnt = 0
  debug('start')
  while (1) {
    const err = ioctl2(cpu_fd, KVM_RUN, 0)
    if (err === 0) {
      const { reason } = io
      if (reason === KVM_EXIT_FAIL_ENTRY) {
        break
      } else if (reason === KVM_EXIT_MMIO) {
        mmio_cnt += 1
        if (mmio_cnt === 1) {
          debug('guest start')
        } else if (mmio_cnt === 2) {
          debug('guest exit')
          break
        }
      } else if (reason === KVM_EXIT_IO) {
        handle_io(io)
      } else {
        console.log('unknown exit reason')
        break
      }
      continue
    }
    if ((lo.errno != EINTR && lo.errno != EAGAIN)) break
  }
  destroy_vm(cfg)
}

const KVM_CREATE_VM = 44545
const KVM_SET_USER_MEMORY_REGION = 1075883590
const KVM_CREATE_VCPU = 44609
const KVM_GET_SREGS = 2167975555
const KVM_SET_SREGS = 1094233732
const KVM_GET_REGS = 2156965505
const KVM_SET_REGS = 1083223682
const KVM_CPUID_SIGNATURE = 1073741824
const KVM_CPUID_FEATURES = 1073741825
const KVM_SET_CPUID2 = 1074310800
const KVM_GET_SUPPORTED_CPUID = 3221794309

const KVM_SET_TSS_ADDR = 44615
const KVM_SET_IDENTITY_MAP_ADDR = 1074310728
const KVM_CREATE_IRQCHIP = 44640
const KVM_CREATE_PIT2 = 1077980791

const CAN_USE_HEAP = 128
const KEEP_SEGMENTS = 64
const ISA_START_ADDRESS = 655360
const E820_RAM = 1
const ISA_END_ADDRESS = 1048576
const KVM_GET_VCPU_MMAP_SIZE = 44548
const KVM_RUN = 44672
const KVM_EXIT_IO = 2
const KVM_EXIT_MMIO = 6
const KVM_EXIT_FAIL_ENTRY = 9
const KVM_EXIT_IO_OUT = 1
const KVM_EXIT_IO_IN = 0
const KVM_SET_MSRS = 1074310793
const boot_params_size = 4096
const kvm_segment_size = 24
const kvm_sregs_size = 312
const kvm_regs_size = 144
const kvm_cpuid_entry2_size = 40
const kvm_userspace_memory_region_size = 32
const kvm_msrs_size = 8
const kvm_msr_entry_size = 16
const COM1_PORT_BASE = 0x03f8
const COM1_PORT_SIZE = 8
const RAM_SIZE = 128 * 1024 * 1024
const RAM_BASE = 0
const UART_TX = 0
const UART_LSR = 5
const UART_LSR_TEMT = 0x40
const UART_LSR_THRE = 0x20
const LSR = UART_LSR_TEMT | UART_LSR_THRE

const hdr_off = 0x1f1
const e820_entries_off =  0x1e8
const e820_table_off = 0x2d0

const registers = [
  'rax', 'rbx', 'rcx', 'rdx',
  'rsi', 'rdi', 'rsp', 'rbp',
  'r8', 'r9', 'r10', 'r11',
  'r12', 'r13', 'r14', 'r15',
  'rip', 'rflags'
].reduce((p, c, i) => {
  p[c] = i * 8
  return p
}, {})

let last = lo.start
let boot_time = last
debug('boot runtime')
const kvm_fd = open('/dev/kvm', O_RDWR)
assert(kvm_fd > 0)
debug('open /dev/kvm')
//const cmdline = cstr('i8042.noaux i8042.nomux i8042.nopnp i8042.nokbd ro selinux=0 mitigations=off noapic pci=off nomodules random.trust_cpu=on audit=0 panic=-1 zswap.enabled=0 console=ttyS0,115200 acpi=off')
const cmdline = cstr('ro selinux=0 mitigations=off random.trust_cpu=on panic=-1 console=hvc0 quiet')
last = lo.hrtime()
while (1) {
  run_vm(kvm_fd)
  console.log('')
  lo.core.usleep(1000000)
  last = boot_time = lo.hrtime()
}