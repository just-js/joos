#!/bin/bash
RELEASE=6.1.5
mkdir -p build
if [ ! -f "build/linux-$RELEASE/arch/x86/boot/bzImage" ]; then
  echo "build linux"
  if [ ! -f "build/linux-$RELEASE.tar.gz" ]; then
    curl -L -o build/linux-$RELEASE.tar.gz https://cdn.kernel.org/pub/linux/kernel/v6.x/linux-$RELEASE.tar.gz
    cd build
    tar -xf linux-$RELEASE.tar.gz
    cd ../
  fi
  cp .config.$RELEASE build/linux-$RELEASE/.config
  cd build/linux-$RELEASE/
  CC="ccache gcc" make ARCH=x86 vmlinux bzImage -j $(nproc --all)
  cd ../../
fi
#LO_CACHE=1 CC="ccache gcc" CXX="ccache g++" LINK="mold -run g++" lo build runtime init
LO_CACHE=1 CC="ccache gcc" CXX="ccache g++" LINK="mold -run g++" lo build runtime vmm
rm -fr lib
ccache gcc -s -o init -O3 -march=native -mtune=native -static init.c
sudo rm -fr build/initrd
mkdir -p build/initrd/dev
LO=$(which lo)
sudo $LO initrd.js
mv init build/initrd/
cd build/initrd/
rm -f initrd.cpio
find . | cpio -o -H newc | lz4 -l -9 > initrd.cpio
#find . -print0 | cpio --null --create --verbose --format=newc > initrd.cpio
mv initrd.cpio ../
cd ../../
cp build/linux-$RELEASE/arch/x86/boot/bzImage /dev/shm/
cp build/initrd.cpio /dev/shm/
cp build/linux-$RELEASE/vmlinux /dev/shm/
