#include <stdio.h>
#include <sys/mman.h>
#include <fcntl.h>
#include <unistd.h>
#include <linux/reboot.h>
#include <sys/reboot.h>

#define MAGIC_VALUE_SIGNAL_GUEST_BOOT_COMPLETE 123

int main () {
  unsigned long FIRST_ADDR_PAST_32BITS = (1UL << 32);
  unsigned long MEM_32BIT_GAP_SIZE = (768UL << 20);
  int fd = open("/dev/mem", (O_RDWR | O_SYNC | O_CLOEXEC));
  int mapped_size = getpagesize();
  char *map_base = (char *)mmap(NULL,
    mapped_size,
    PROT_WRITE,
    MAP_SHARED,
    fd,
    FIRST_ADDR_PAST_32BITS - MEM_32BIT_GAP_SIZE);
  *map_base = MAGIC_VALUE_SIGNAL_GUEST_BOOT_COMPLETE;
  msync(map_base, mapped_size, MS_SYNC);
  *map_base = MAGIC_VALUE_SIGNAL_GUEST_BOOT_COMPLETE;
  msync(map_base, mapped_size, MS_SYNC);
  munmap(map_base, mapped_size);
  close(fd);
  reboot(LINUX_REBOOT_CMD_HALT);
}
