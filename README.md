# joos

A KVM Virtual Machine Manager in JavaScript

## introduction

this is an attempt to build a functioning and useful virtual machine manager (vmm)
completely in JavaScript, on the "lo" JavaScript [runtime](https://github.com/just-js/lo).

## building

### from scratch


### with docker



## example run

```shell
lo vmm.js
```

- **CPU**: Intel(R) Core(TM) i5-8250U CPU @ 1.60GHz
- **OS**: 22.04.1-Ubuntu
- **Kernel**: 6.5.0-35-generic


### init.c

- guest vm allocated 40 MB RAM

```shell
KVM_CREATE_VM                   15870335   15870335 rss 48254976
KVM_SET_TSS_ADDR                   46781   15917116 rss 48254976
KVM_SET_IDENTITY_MAP_ADDR          33769   15950885 rss 48254976
mmap guest ram                     29475   15980360 rss 48254976
KVM_SET_USER_MEMORY_REGION         80483   16060843 rss 48254976
KVM_CREATE_VCPU                   592125   16652968 rss 48254976
init sreg                          71544   16724512 rss 48254976
init reg                           28386   16752898 rss 48254976
init cpuid                         70984   16823882 rss 48254976
init msrs                          33211   16857093 rss 48254976
read bzImage                      432902   17289995 rss 48254976
load kernel image                1103234   18393229 rss 49958912
set bootparams                     20578   18413807 rss 49958912
read initrd                       106857   18520664 rss 49958912
load initrd                       253248   18773912 rss 50483200
load bootparams                    15972   18789884 rss 50483200
mmap runfd                         24961   18814845 rss 50483200
start                              15053   18829898 rss 50483200
guest start                     35100907   53930805 rss 73551872
guest exit                         46234   53977039 rss 73551872
cleanup                         41463018   95440057 rss 48254976
```

This shows timing at steady state from running the compiled version of vmm.js against an initrd using the init.c c program.

### init.js

- guest vm allocated 80 MB RAM

```shell
KVM_CREATE_VM                   15915961   15915961 rss 62046208
KVM_SET_TSS_ADDR                   53638   15969599 rss 62046208
KVM_SET_IDENTITY_MAP_ADDR          33903   16003502 rss 62046208
mmap guest ram                     34271   16037773 rss 62046208
KVM_SET_USER_MEMORY_REGION        113231   16151004 rss 62046208
KVM_CREATE_VCPU                   507745   16658749 rss 62046208
init sreg                          59081   16717830 rss 62046208
init reg                           24656   16742486 rss 62046208
init cpuid                         71225   16813711 rss 62046208
init msrs                          39080   16852791 rss 62046208
read bzImage                      418599   17271390 rss 62046208
load kernel image                1053564   18324954 rss 63750144
set bootparams                     18668   18343622 rss 63750144
read initrd                      3305841   21649463 rss 63750144
load initrd                      8082051   29731514 rss 78168064
load bootparams                    40560   29772074 rss 78168064
mmap runfd                         35785   29807859 rss 78168064
start                              15778   29823637 rss 78168064
guest start                     36013545   65837182 rss 101367808
guest exit                         51284   65888466 rss 101367808
cleanup                         61857710  127746176 rss 62046208
```

This shows timing at steady state from running the compiled version of vmm.js against an initrd using the init.js JavaScript program compiled to a static binary.

### analysis

- takes ```~16 ms``` to create the VM using the ```KVM_CREATEVM``` ioctl
- takes ```~0.5 ms``` to create a VCPU
- ```bzImage``` is ```1.8 MB``` using LZ4 compression and takes ```~0.5 ms``` to read from ```/dev/shm```
- it takes ```~1 ms``` to set boot options and copy the ```bzImage``` into guest memory
- ```initrd``` is ```~820 KB``` and it takes ```~0.6 ms``` to read it from ```/dev/shm``` and load it into guest memory
- when we build the JavaScript init program the ```initrd``` is ```~32 MB```. this takes ```~6.6 ms``` to read from ```/dev/shm``` and ```~18 ms``` to copy into guest memory. so, roughly ```0.7 ms``` per megabyte of initrd.
- it takes ```~36 ms``` from booting the guest kernel to receiving the mmio event from the guest init program
  - this is with ```lz4``` kernel compression. with ```gzip``` this takes ```~60 ms``` and with lzma ```~200 ms```
- cleaning up the guest memory, unmapping memory mapped files and closing file descriptors takes ```~60 ms```
- there are no memory leaks. if we run continually we can see memory does not increase apart from some ```3-4 MB``` of v8 garbage that accumulates every 5 seconds or so before being freed by GC

## todo

- handle terminal io correctly
- figure out why it hangs when we enable the IRQ chip
- add pvh boot support for loading vmlinux 
- run the cpu on it's own thread
- optimize everywhere we can
- lots more...
