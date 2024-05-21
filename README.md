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

```shell
KVM_CREATE_VM                   16098987   16098987 rss 32501760
KVM_SET_TSS_ADDR                   68847   16167834 rss 32501760
KVM_SET_IDENTITY_MAP_ADDR          84237   16252071 rss 32501760
mmap guest ram                     53053   16305124 rss 32501760
KVM_SET_USER_MEMORY_REGION        102109   16407233 rss 32501760
KVM_CREATE_VCPU                   516024   16923257 rss 32501760
init sreg                          75972   16999229 rss 32501760
init reg                           46470   17045699 rss 32501760
init cpuid                         77125   17122824 rss 32501760
init msrs                          34155   17156979 rss 32501760
read bzImage                      983633   18140612 rss 34205696
load kernel image                1039257   19179869 rss 36040704
set bootparams                     25038   19204907 rss 36040704
read initrd                       440879   19645786 rss 36827136
load initrd                       580298   20226084 rss 37744640
load bootparams                    18363   20244447 rss 37744640
mmap runfd                         25930   20270377 rss 37744640
start                              22115   20292492 rss 37744640
guest start                     35833982   56126474 rss 60944384
guest exit                         54680   56181154 rss 60944384
cleanup                         60008062  116189216 rss 35192832
```

This shows timing at steady state from running the compiled version of vmm.js against an initrd using the init.c c program.

### init.js

```shell
KVM_CREATE_VM                   15634088   15634088 rss 56156160
KVM_SET_TSS_ADDR                   51974   15686062 rss 56156160
KVM_SET_IDENTITY_MAP_ADDR         141317   15827379 rss 56156160
mmap guest ram                     48397   15875776 rss 56156160
KVM_SET_USER_MEMORY_REGION         95573   15971349 rss 56156160
KVM_CREATE_VCPU                   447349   16418698 rss 56156160
init sreg                          62923   16481621 rss 56156160
init reg                           28553   16510174 rss 56156160
init cpuid                         65826   16576000 rss 56156160
init msrs                          30608   16606608 rss 56156160
read bzImage                      421702   17028310 rss 56156160
load kernel image                1085252   18113562 rss 57860096
set bootparams                     30624   18144186 rss 57860096
read initrd                      6632797   24776983 rss 57860096
load initrd                     18768147   43545130 rss 90234880
load bootparams                    53517   43598647 rss 90234880
mmap runfd                         44479   43643126 rss 90234880
start                              25734   43668860 rss 90234880
guest start                     35515214   79184074 rss 113434624
guest exit                         51356   79235430 rss 113434624
cleanup                         60061645  139297075 rss 56160256
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

just running one vm and then shutting down, and with debug logging turned off, the best time to run a vm seen under hyperfine is ```~103 ms```

```shell
$ hyperfine --warmup 10 ./vmm
Benchmark 1: ./vmm
  Time (mean ± σ):     132.4 ms ±  12.2 ms    [User: 32.0 ms, System: 21.2 ms]
  Range (min … max):   102.7 ms … 150.7 ms    21 runs
```

## todo

- handle terminal io correctly
- figure out why it hangs when we enable the IRQ chip
- add pvh boot support for loading vmlinux 
- run the cpu on it's own thread
- optimize everywhere we can
- lots more...
