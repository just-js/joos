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

- guest vm allocated 30 MB RAM, times in nanoseconds, memory in bytes

```shell
KVM_CREATE_VM                   15823979   15823979 rss 37683200
KVM_SET_TSS_ADDR                   67443   15891422 rss 37683200
KVM_SET_IDENTITY_MAP_ADDR          54573   15945995 rss 37683200
mmap guest ram                     56329   16002324 rss 37683200
KVM_SET_USER_MEMORY_REGION         92621   16094945 rss 37683200
KVM_CREATE_VCPU                   525789   16620734 rss 37683200
init sreg                          72161   16692895 rss 37683200
init reg                           36530   16729425 rss 37683200
init cpuid                         74564   16803989 rss 37683200
init msrs                          30150   16834139 rss 37683200
read bzImage                      411313   17245452 rss 37683200
load kernel image                1073504   18318956 rss 39387136
set bootparams                     26134   18345090 rss 39387136
read initrd                       102031   18447121 rss 39387136
load initrd                       612288   19059409 rss 39780352
load bootparams                    23351   19082760 rss 39780352
mmap runfd                         34485   19117245 rss 39780352
start                              22604   19139849 rss 39780352
guest start                     28230316   47370165 rss 55771136
guest exit                         53398   47423563 rss 55771136
cleanup                         52088786   99512349 rss 37683200
```

This shows timing at steady state from running the compiled version of vmm.js against an initrd using the init.c c program.

### init.js

- guest vm allocated 70 MB RAM, times in nanoseconds, memory in bytes

```shell
KVM_CREATE_VM                   16070990   16070990 rss 40271872
KVM_SET_TSS_ADDR                   52270   16123260 rss 40271872
KVM_SET_IDENTITY_MAP_ADDR          38049   16161309 rss 40271872
mmap guest ram                     30697   16192006 rss 40271872
KVM_SET_USER_MEMORY_REGION        117848   16309854 rss 40271872
KVM_CREATE_VCPU                   515170   16825024 rss 40271872
init sreg                          87838   16912862 rss 40271872
init reg                           45395   16958257 rss 40271872
init cpuid                         80107   17038364 rss 40271872
init msrs                          29611   17067975 rss 40271872
read bzImage                      409044   17477019 rss 40271872
load kernel image                1075949   18552968 rss 41975808
set bootparams                     21115   18574083 rss 41975808
read initrd                      3060629   21634712 rss 41975808
load initrd                      8210769   29845481 rss 56393728
load bootparams                    42036   29887517 rss 56393728
mmap runfd                         34127   29921644 rss 56393728
start                              29147   29950791 rss 56393728
guest start                     28514606   58465397 rss 72384512
guest exit                         53272   58518669 rss 72384512
cleanup                         41390106   99908775 rss 40271872
```

This shows timing at steady state from running the compiled version of vmm.js against an initrd using the init.js JavaScript program compiled to a static binary.

### analysis

- it takes ```~16 ms``` to create the VM using the ```KVM_CREATEVM``` ioctl
- it takes ```~0.5 ms``` to create a VCPU
- ```bzImage``` is ```1.8 MB``` using LZ4 compression and takes ```~0.4 ms``` to read from ```/dev/shm```
- it takes ```~1 ms``` to set boot options and copy the ```bzImage``` into guest memory
- for the init.c guest, the lz4 compressed ```initramfs``` is ```~400 KB``` and it takes ```~0.1 ms``` to read it from ```/dev/shm``` and ```~0.6ms``` to copy into guest memory
- for the init.js guest the lz4 compressed ```initramfs``` is ```~14 MB```. this takes ```~3 ms``` to read from ```/dev/shm``` and ```~8 ms``` to copy into guest memory. 
- it takes ```~28 ms``` from booting the guest kernel to receiving the mmio event from the guest init.c program
  - this is with ```lz4``` kernel compression. with ```gzip``` this takes ```~60 ms``` and with lzma ```~200 ms```
- it takes ```~28 ms``` from booting the guest kernel to receiving the mmio event from the guest init.js program, the same as for the init.c version
- cleaning up the guest memory, unmapping memory mapped files and closing file descriptors takes ```~50 ms```
- there are no memory leaks. if we run continually we can see memory does not increase apart from some ```3-4 MB``` of v8 garbage that accumulates every 5 seconds or so before being freed by GC
- steady state memory usage between runs is ```~40 MB``` for the vmm host program, written in JavaScript. When the guest runs, memory increases to ```~56 MB``` for the init.c version and ```~72 MB``` for the init.js version

## kernel boot log

```shell
[    0.000000] Linux version 6.1.5 (andrew@inspiron) (gcc (Ubuntu 11.4.0-1ubuntu1~22.04) 11.4.0, GNU ld (GNU Binutils for Ubuntu) 2.38) #21 SMP Tue May 21 12:49:18 IST 2024
[    0.000000] Command line: ro reboot=k i8042.noaux i8042.nomux i8042.nopnp i8042.nokbd noapic mitigations=off random.trust_cpu=on panic=-1 console=ttyS0,115200
[    0.000000] Intel Spectre v2 broken microcode detected; disabling Speculation Control
[    0.000000] Disabled fast string operations
[    0.000000] x86/fpu: Supporting XSAVE feature 0x001: 'x87 floating point registers'
[    0.000000] x86/fpu: Supporting XSAVE feature 0x002: 'SSE registers'
[    0.000000] x86/fpu: Supporting XSAVE feature 0x004: 'AVX registers'
[    0.000000] x86/fpu: Supporting XSAVE feature 0x008: 'MPX bounds registers'
[    0.000000] x86/fpu: Supporting XSAVE feature 0x010: 'MPX CSR'
[    0.000000] x86/fpu: xstate_offset[2]:  576, xstate_sizes[2]:  256
[    0.000000] x86/fpu: xstate_offset[3]:  832, xstate_sizes[3]:   64
[    0.000000] x86/fpu: xstate_offset[4]:  896, xstate_sizes[4]:   64
[    0.000000] x86/fpu: Enabled xstate features 0x1f, context size is 960 bytes, using 'compacted' format.
[    0.000000] signal: max sigframe size: 1616
[    0.000000] BIOS-provided physical RAM map:
[    0.000000] BIOS-e820: [mem 0x0000000000000000-0x000000000009fffe] usable
[    0.000000] BIOS-e820: [mem 0x0000000000100000-0x0000000001ffffff] usable
[    0.000000] NX (Execute Disable) protection: active
[    0.000000] DMI not present or invalid.
[    0.000000] tsc: Fast TSC calibration using PIT
[    0.000000] tsc: Detected 1799.886 MHz processor
[    0.000142] e820: update [mem 0x00000000-0x00000fff] usable ==> reserved
[    0.000146] e820: remove [mem 0x000a0000-0x000fffff] usable
[    0.000150] last_pfn = 0x2000 max_arch_pfn = 0x400000000
[    0.000194] Disabled
[    0.000195] x86/PAT: MTRRs disabled, skipping PAT initialization too.
[    0.000208] CPU MTRRs all blank - virtualized system.
[    0.000211] x86/PAT: Configuration [0-7]: WB  WT  UC- UC  WB  WT  UC- UC  
[    0.012382] Using GB pages for direct mapping
[    0.012524] RAMDISK: [mem 0x01f00000-0x01f61fff]
[    0.012558] Zone ranges:
[    0.012559]   DMA      [mem 0x0000000000001000-0x0000000000ffffff]
[    0.012561]   DMA32    [mem 0x0000000001000000-0x0000000001ffffff]
[    0.012563]   Normal   empty
[    0.012564] Movable zone start for each node
[    0.012564] Early memory node ranges
[    0.012564]   node   0: [mem 0x0000000000001000-0x000000000009efff]
[    0.012566]   node   0: [mem 0x0000000000100000-0x0000000001ffffff]
[    0.012567] Initmem setup node 0 [mem 0x0000000000001000-0x0000000001ffffff]
[    0.012580] On node 0, zone DMA: 1 pages in unavailable ranges
[    0.012750] On node 0, zone DMA: 97 pages in unavailable ranges
[    0.014144] On node 0, zone DMA32: 24576 pages in unavailable ranges
[    0.014177] smpboot: Boot CPU (id 0) not listed by BIOS
[    0.014178] smpboot: Allowing 1 CPUs, 0 hotplug CPUs
[    0.014183] [mem 0x02000000-0xffffffff] available for PCI devices
[    0.014184] Booting paravirtualized kernel on bare hardware
[    0.014186] clocksource: refined-jiffies: mask: 0xffffffff max_cycles: 0xffffffff, max_idle_ns: 7645519600211568 ns
[    0.014192] setup_percpu: NR_CPUS:4 nr_cpumask_bits:1 nr_cpu_ids:1 nr_node_ids:1
[    0.014649] percpu: Embedded 40 pages/cpu s132952 r0 d30888 u2097152
[    0.014652] pcpu-alloc: s132952 r0 d30888 u2097152 alloc=1*2097152
[    0.014655] pcpu-alloc: [0] 0 
[    0.014666] Built 1 zonelists, mobility grouping on.  Total pages: 7824
[    0.014668] Kernel command line: ro reboot=k i8042.noaux i8042.nomux i8042.nopnp i8042.nokbd noapic mitigations=off random.trust_cpu=on panic=-1 console=ttyS0,115200
[    0.014742] random: crng init done
[    0.014762] Dentry cache hash table entries: 4096 (order: 3, 32768 bytes, linear)
[    0.014776] Inode-cache hash table entries: 2048 (order: 2, 16384 bytes, linear)
[    0.014823] mem auto-init: stack:off, heap alloc:off, heap free:off
[    0.014935] Memory: 18796K/32376K available (4096K kernel code, 447K rwdata, 548K rodata, 696K init, 864K bss, 13324K reserved, 0K cma-reserved)
[    0.014987] rcu: Hierarchical RCU implementation.
[    0.014987] rcu:     RCU restricting CPUs from NR_CPUS=4 to nr_cpu_ids=1.
[    0.014989] rcu: RCU calculated value of scheduler-enlistment delay is 25 jiffies.
[    0.014989] rcu: Adjusting geometry for rcu_fanout_leaf=16, nr_cpu_ids=1
[    0.015003] NR_IRQS: 4352, nr_irqs: 24, preallocated irqs: 16
[    0.015257] rcu: srcu_init: Setting srcu_struct sizes based on contention.
[    0.016464] Console: colour VGA+ 142x228
[    0.078095] printk: console [ttyS0] enabled
[    0.078871] APIC: ACPI MADT or MP tables are not detected
[    0.079879] APIC: Switch to virtual wire mode setup with no configuration
[    0.081129] Not enabling interrupt remapping due to skipped IO-APIC setup
[    0.082557] clocksource: tsc-early: mask: 0xffffffffffffffff max_cycles: 0x19f1bdd8caf, max_idle_ns: 440795227017 ns
[    0.084570] Calibrating delay loop (skipped), value calculated using timer frequency.. 3599.77 BogoMIPS (lpj=7199544)
[    0.086437] pid_max: default: 32768 minimum: 301
[    0.087353] Mount-cache hash table entries: 512 (order: 0, 4096 bytes, linear)
[    0.088580] Mountpoint-cache hash table entries: 512 (order: 0, 4096 bytes, linear)
[    0.090210] Disabled fast string operations
[    0.091033] x86/cpu: User Mode Instruction Prevention (UMIP) activated
[    0.092609] Last level iTLB entries: 4KB 64, 2MB 8, 4MB 8
[    0.093559] Last level dTLB entries: 4KB 64, 2MB 0, 4MB 0, 1GB 4
[    0.094672] Speculative Store Bypass: Vulnerable
[    0.095547] SRBDS: Vulnerable: No microcode
[    0.097610] Freeing SMP alternatives memory: 8K
[    0.098519] smpboot: CPU 0 Converting physical 6 to logical package 0
[    0.099715] smpboot: SMP disabled
[    0.100652] Performance Events: Skylake events, 32-deep LBR, full-width counters, Intel PMU driver.
[    0.102348] ... version:                2
[    0.103107] ... bit width:              48
[    0.103909] ... generic registers:      4
[    0.104573] ... value mask:             0000ffffffffffff
[    0.105581] ... max period:             00007fffffffffff
[    0.106581] ... fixed-purpose events:   3
[    0.107334] ... event mask:             000000070000000f
[    0.112612] rcu: Hierarchical SRCU implementation.
[    0.113176] rcu:     Max phase no-delay instances is 1000.
[    0.113793] smp: Bringing up secondary CPUs ...
[    0.114413] smp: Brought up 1 node, 1 CPU
[    0.115135] smpboot: Max logical packages: 1
[    0.115925] smpboot: Total of 1 processors activated (3599.77 BogoMIPS)
[    0.116737] clocksource: jiffies: mask: 0xffffffff max_cycles: 0xffffffff, max_idle_ns: 7645041785100000 ns
[    0.118532] futex hash table entries: 256 (order: 2, 16384 bytes, linear)
[    0.121475] clocksource: Switched to clocksource tsc-early
[    0.123013] platform rtc_cmos: registered platform RTC device (no PNP device found)
[    0.123808] Unpacking initramfs...
[    0.127083] Freeing initrd memory: 392K
[    0.128007] workingset: timestamp_bits=62 max_order=13 bucket_order=0
[    0.129972] Serial: 8250/16550 driver, 1 ports, IRQ sharing disabled
[    0.131758] IPI shorthand broadcast: enabled
[    0.132575] sched_clock: Marking stable (64073132, 65135839)->(141906943, -12697972)
[    0.134153] Freeing unused kernel image (initmem) memory: 696K
[    0.140872] Write protecting the kernel read-only data: 8192k
[    0.141868] Freeing unused kernel image (text/rodata gap) memory: 2044K
[    0.142796] Freeing unused kernel image (rodata/data gap) memory: 1500K
[    0.143551] Run /init as init process
[    0.143987]   with arguments:
[    0.144327]     /init
[    0.144627]   with environment:
[    0.144991]     HOME=/
[    0.145266]     TERM=linux
```

## todo

- handle terminal io correctly
- figure out why it hangs when we enable the IRQ chip
- add pvh boot support for loading vmlinux 
- run the cpu on it's own thread
- optimize everywhere we can
- lots more...
