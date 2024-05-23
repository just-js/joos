const { core } = lo.library('core')
const { fsmount } = lo.library('fsmount')

const { wrapMemory, utf8Decode, utf8Encode, utf8EncodeInto } = lo
const {
  O_RDWR, O_SYNC, O_CLOEXEC, PROT_WRITE, MAP_SHARED, LINUX_REBOOT_CMD_HALT, 
  MS_SYNC, O_RDONLY, S_IRWXU, S_IRWXG, S_IROTH,
  open, close, reboot, msync, getpagesize, exit, pread, mkdir
} = core
const { mount } = fsmount
const dir_flags = S_IRWXU | S_IRWXG | S_IROTH

function findmem (str) {
  const space = ' '
  let spaces = 0
  let last = 0
  while (spaces < 24) {
    const i = str.indexOf(space, last)
    if (i > 0) {
      if (spaces++ === 23) return (Number(str.slice(last, i)) * 4096)
      last = i + 1
    } else {
      break
    }
  }
}

function wrap (handle, fn, plen = 0) {
  const call = fn
  const params = (new Array(plen)).fill(0).map((_, i) => `p${i}`).join(', ')
  const f = new Function(
    'handle',
    'call',
    `return function ${fn.name} (${params}) {
    call(${params}${plen > 0 ? ', ' : ''}handle);
    const v = handle[0] + ((2 ** 32) * handle[1])
    return handle[0] + ((2 ** 32) * handle[1]);
  }`,)
  const fun = f(handle, call)
  if (fn.state) fun.state = fn.state
  return fun
}

function assert (condition, message, ErrorType = Error) {
  if (!condition) {
    if (message && message.constructor.name === 'Function') {
      throw new ErrorType(message(condition))
    }
    throw new ErrorType(message || "Assertion failed")
  }
  return condition
}

function addr (u32) {
  return u32[0] + ((2 ** 32) * u32[1])  
}

function ptr (u8) {
  u8.ptr = getAddress(u8)
  u8.size = u8.byteLength
  return u8
}

function mem () {
  if (pread(fd, buf, 1024, 0) > 0) return findmem(decoder.decode(buf))
  return 0
}

class TextEncoder {
  encoding = 'utf-8'

  encode (input = '') {
    return utf8Encode(input)
  }

  encodeInto (src, dest) {
    return utf8EncodeInto(src, dest)
  }
}

class TextDecoder {
  encoding = 'utf-8'

  decode (u8) {
    if (!u8.ptr) ptr(u8)
    return utf8Decode(u8.ptr, u8.size)
  }
}

const u32 = new Uint32Array(2)
const getAddress = wrap(u32, lo.getAddress, 1)
const mmap = wrap(u32, core.mmap, 6)
const MAGIC_VALUE_SIGNAL_GUEST_BOOT_COMPLETE = 123
const FIRST_ADDR_PAST_32BITS = Math.pow(2, 32)
const MEM_32BIT_GAP_SIZE = 768 << 20
const mem_fd = open('/dev/mem', O_RDWR | O_SYNC | O_CLOEXEC, 0)
const mapped_size = getpagesize()
const io_ptr = mmap(0, mapped_size, PROT_WRITE, MAP_SHARED, mem_fd, 
  FIRST_ADDR_PAST_32BITS - MEM_32BIT_GAP_SIZE)
const bytes = new Uint8Array(wrapMemory(io_ptr, mapped_size))
bytes[0] = MAGIC_VALUE_SIGNAL_GUEST_BOOT_COMPLETE
msync(io_ptr, mapped_size, MS_SYNC)
const bytes_32 = new Uint32Array(bytes.buffer)
const decoder = new TextDecoder()
const buf = new Uint8Array(1024)
assert(mkdir('/proc', dir_flags) === 0)
assert(mount('proc', '/proc', 'proc', 0, 0) === 0)
const fd = open(`/proc/self/stat`, O_RDONLY)
assert(fd > 0)
bytes[0] = MAGIC_VALUE_SIGNAL_GUEST_BOOT_COMPLETE
lo.print(`${mem()}\n`)
msync(io_ptr, mapped_size, MS_SYNC)
close(mem_fd)
close(fd)
//reboot(LINUX_REBOOT_CMD_HALT)
exit(0)
