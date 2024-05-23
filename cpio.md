https://docs.kernel.org/driver-api/early-userspace/buffer-format.html

110 + filename + zero

```
*       is used to indicate "0 or more occurrences of"
(|)     indicates alternatives
+       indicates concatenation
GZIP()  indicates the gzip(1) of the operand
ALGN(n) means padding with null bytes to an n-byte boundary

initramfs  := ("\0" | cpio_archive | cpio_gzip_archive)*

cpio_gzip_archive := GZIP(cpio_archive)

cpio_archive := cpio_file* + (<nothing> | cpio_trailer)

cpio_file := ALGN(4) + cpio_header + filename + "\0" + ALGN(4) + data

cpio_trailer := ALGN(4) + cpio_header + "TRAILER!!!\0" + ALGN(4)
```

<table class="docutils align-default">
<colgroup>
<col style="width: 17%">
<col style="width: 23%">
<col style="width: 60%">
</colgroup>
<thead>
<tr class="row-odd"><th class="head"><p>Field name</p></th>
<th class="head"><p>Field size</p></th>
<th class="head"><p>Meaning</p></th>
</tr>
</thead>
<tbody>
<tr class="row-even"><td><p>c_magic</p></td>
<td><p>6 bytes</p></td>
<td><p>The string “070701” or “070702”</p></td>
</tr>
<tr class="row-odd"><td><p>c_ino</p></td>
<td><p>8 bytes</p></td>
<td><p>File inode number</p></td>
</tr>
<tr class="row-even"><td><p>c_mode</p></td>
<td><p>8 bytes</p></td>
<td><p>File mode and permissions</p></td>
</tr>
<tr class="row-odd"><td><p>c_uid</p></td>
<td><p>8 bytes</p></td>
<td><p>File uid</p></td>
</tr>
<tr class="row-even"><td><p>c_gid</p></td>
<td><p>8 bytes</p></td>
<td><p>File gid</p></td>
</tr>
<tr class="row-odd"><td><p>c_nlink</p></td>
<td><p>8 bytes</p></td>
<td><p>Number of links</p></td>
</tr>
<tr class="row-even"><td><p>c_mtime</p></td>
<td><p>8 bytes</p></td>
<td><p>Modification time</p></td>
</tr>
<tr class="row-odd"><td><p>c_filesize</p></td>
<td><p>8 bytes</p></td>
<td><p>Size of data field</p></td>
</tr>
<tr class="row-even"><td><p>c_maj</p></td>
<td><p>8 bytes</p></td>
<td><p>Major part of file device number</p></td>
</tr>
<tr class="row-odd"><td><p>c_min</p></td>
<td><p>8 bytes</p></td>
<td><p>Minor part of file device number</p></td>
</tr>
<tr class="row-even"><td><p>c_rmaj</p></td>
<td><p>8 bytes</p></td>
<td><p>Major part of device node reference</p></td>
</tr>
<tr class="row-odd"><td><p>c_rmin</p></td>
<td><p>8 bytes</p></td>
<td><p>Minor part of device node reference</p></td>
</tr>
<tr class="row-even"><td><p>c_namesize</p></td>
<td><p>8 bytes</p></td>
<td><p>Length of filename, including final 0</p></td>
</tr>
<tr class="row-odd"><td><p>c_chksum</p></td>
<td><p>8 bytes</p></td>
<td><p>Checksum of data field if c_magic is 070702;
otherwise zero</p></td>
</tr>
</tbody>
</table>

```
00000000: 3037 3037 3031 3030 3643 4230 4535 3030  070701006CB0E500
00000010: 3030 3431 4644 3030 3030 3033 4538 3030  0041FD000003E800
00000020: 3030 3033 4538 3030 3030 3030 3033 3636  0003E80000000366
00000030: 3444 3832 3046 3030 3030 3030 3030 3030  4D820F0000000000
00000040: 3030 3030 3038 3030 3030 3030 3231 3030  0000080000002100
00000050: 3030 3030 3030 3030 3030 3030 3030 3030  0000000000000000
00000060: 3030 3030 3032 3030 3030 3030 3030 2e00  00000200000000..
00000070: 3037 3037 3031 3030 3643 4230 4536 3030  070701006CB0E600
00000080: 3030 3431 4644 3030 3030 3033 4538 3030  0041FD000003E800
00000090: 3030 3033 4538 3030 3030 3030 3032 3636  0003E80000000266
000000a0: 3444 3832 3046 3030 3030 3030 3030 3030  4D820F0000000000
000000b0: 3030 3030 3038 3030 3030 3030 3231 3030  0000080000002100
000000c0: 3030 3030 3030 3030 3030 3030 3030 3030  0000000000000000
000000d0: 3030 3030 3034 3030 3030 3030 3030 6465  00000400000000de
000000e0: 7600 0000 3037 3037 3031 3030 3643 4230  v...070701006CB0
000000f0: 4631 3030 3030 3231 4134 3030 3030 3030  F1000021A4000000
00000100: 3030 3030 3030 3030 3030 3030 3030 3030  0000000000000000
00000110: 3031 3636 3444 3832 3046 3030 3030 3030  01664D820F000000
00000120: 3030 3030 3030 3030 3038 3030 3030 3030  0000000008000000
00000130: 3231 3030 3030 3030 3031 3030 3030 3030  2100000001000000
00000140: 3033 3030 3030 3030 3039 3030 3030 3030  0300000009000000
00000150: 3030 6465 762f 6e75 6c6c 0000 3037 3037  00dev/null..0707
00000160: 3031 3030 3643 4230 4632 3030 3030 3231  01006CB0F2000021
00000170: 4134 3030 3030 3030 3030 3030 3030 3030  A400000000000000
00000180: 3030 3030 3030 3030 3031 3636 3444 3832  0000000001664D82
00000190: 3046 3030 3030 3030 3030 3030 3030 3030  0F00000000000000
000001a0: 3038 3030 3030 3030 3231 3030 3030 3030  0800000021000000
000001b0: 3031 3030 3030 3030 3035 3030 3030 3030  0100000005000000
000001c0: 3039 3030 3030 3030 3030 6465 762f 7a65  0900000000dev/ze
000001d0: 726f 0000 3037 3037 3031 3030 3643 4230  ro..070701006CB0
000001e0: 4633 3030 3030 3231 4134 3030 3030 3030  F3000021A4000000
000001f0: 3030 3030 3030 3030 3030 3030 3030 3030  0000000000000000
00000200: 3031 3636 3444 3832 3046 3030 3030 3030  01664D820F000000
00000210: 3030 3030 3030 3030 3038 3030 3030 3030  0000000008000000
00000220: 3231 3030 3030 3030 3031 3030 3030 3030  2100000001000000
00000230: 3039 3030 3030 3030 3043 3030 3030 3030  090000000C000000
00000240: 3030 6465 762f 7572 616e 646f 6d00 0000  00dev/urandom...
```
