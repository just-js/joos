import { repl } from 'lib/repl.js'

const { fsmount } = lo.load('fsmount')
const { core, assert, wrap_memory } = lo
const { open, getpagesize, mmap, close, reboot, munmap, mkdir } = core
const { 
  O_RDWR, O_SYNC, O_CLOEXEC, PROT_WRITE, MAP_SHARED, LINUX_REBOOT_CMD_RESTART,
  S_IRWXU, S_IRWXG, S_IROTH
} = core
const { mount } = fsmount

const PORT_ADDRESS = Math.pow(2, 32) - (768 << 20)

function mmio_signal () {
  const mem_fd = open('/dev/mem', O_RDWR | O_SYNC | O_CLOEXEC, 0)
  assert(mem_fd > 0)
  const page_size = getpagesize()
  const addr = mmap(0, page_size, PROT_WRITE, MAP_SHARED, mem_fd, PORT_ADDRESS)
  const bytes = wrap_memory(addr, page_size)
  bytes[0] = 123
  munmap(addr, page_size)
  close(mem_fd)
}

// mount procfs
assert(mkdir('/proc', S_IRWXU | S_IRWXG | S_IROTH) === 0);
assert(mount('proc', '/proc', 'proc', 0, 0) === 0);
assert(mount('tmpfs', '/tmp', 'tmpfs', 0, 0) === 0);

const encoder = new TextEncoder()
lo.core.write_file("/tmp/foo.txt", encoder.encode("hello"))
const bytes = lo.core.read_file("/tmp/foo.txt")
assert(bytes.length === 5)

// write to mmio device to signal vmm we have started
mmio_signal()
// launch a repl and wait for it
await repl()

// if we do this, we don't get a kernel panic
reboot(LINUX_REBOOT_CMD_RESTART)
