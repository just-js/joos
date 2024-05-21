const { core } = lo.library('core')

const { wrapMemory } = lo
const {
  O_RDWR, O_SYNC, O_CLOEXEC, PROT_WRITE, MAP_SHARED, LINUX_REBOOT_CMD_HALT, 
  MS_SYNC,
  open, mmap, close, reboot, msync, getpagesize
} = core

const MAGIC_VALUE_SIGNAL_GUEST_BOOT_COMPLETE = 123
const FIRST_ADDR_PAST_32BITS = Math.pow(2, 32)
const MEM_32BIT_GAP_SIZE = 768 << 20
const fd = open('/dev/mem', O_RDWR | O_SYNC | O_CLOEXEC, 0)
const mapped_size = getpagesize()
const u32 = new Uint32Array(2)
mmap(0, mapped_size, PROT_WRITE, MAP_SHARED, fd, 
  FIRST_ADDR_PAST_32BITS - MEM_32BIT_GAP_SIZE, u32)
const ptr = u32[0] + ((2 ** 32) * u32[1])
const bytes = new Uint8Array(wrapMemory(ptr, mapped_size))
bytes[0] = MAGIC_VALUE_SIGNAL_GUEST_BOOT_COMPLETE
msync(ptr, mapped_size, MS_SYNC)
bytes[0] = MAGIC_VALUE_SIGNAL_GUEST_BOOT_COMPLETE
msync(ptr, mapped_size, MS_SYNC)
close (fd)
reboot(LINUX_REBOOT_CMD_HALT)
