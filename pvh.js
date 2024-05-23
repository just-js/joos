import { getHeader } from 'lib/elf.js'
import { dump } from 'lib/binary.js'

const { ptr, little_endian } = lo

function read_vmlinux (path) {
  const header = getHeader(path)
  const { entrypoint, phoff, phteSize, phEntries } = header
  const PT_LOAD = 1
  const PT_NOTE = 4
  const program_headers = { [PT_LOAD]: [], [PT_NOTE]: [] }
  let off = Number(phoff)
  for (let i = 0; i < phEntries; i++) {
    const program_header = header.bytes.subarray(Number(off), Number(off) + phteSize)
    const dv = new DataView(program_header.buffer, program_header.byteOffset, program_header.length)
    const type = dv.getUint8(0)
    const offset = Number(dv.getBigUint64(8, true))
    const virt_address = Number(dv.getBigUint64(16, true))
    const phys_address = Number(dv.getBigUint64(24, true))
    const file_size = Number(dv.getBigUint64(32, true))
    const mem_size = Number(dv.getBigUint64(40, true))
    const flags = Number(dv.getBigUint64(48, true))
    const ph = { type, offset, virt_address, phys_address, file_size, mem_size, flags }
    program_headers[type].push(ph)
    off += phteSize
  }
  return { header, entrypoint, program_headers }
}

function parse_elf_note(dv, u8) {
  let off = 0
  let pvh_address = 0
  while (off < u8.length) {
    const namesz = dv.getUint32(off, little_endian)
    off += ELFNOTE_ALIGN
    const descsz = dv.getUint32(off, little_endian)
    off += ELFNOTE_ALIGN
    const type = dv.getUint32(off, little_endian)
    off += ELFNOTE_ALIGN
    off += (namesz % ELFNOTE_ALIGN) > 0 ? namesz + (ELFNOTE_ALIGN - (namesz % ELFNOTE_ALIGN)) : namesz
    if (type === XEN_ELFNOTE_PHYS32_ENTRY && descsz >= ELFNOTE_ALIGN) {
      pvh_address = dv.getUint32(off, little_endian)
    }
    off += (descsz % ELFNOTE_ALIGN) > 0 ? descsz + (ELFNOTE_ALIGN - (descsz % ELFNOTE_ALIGN)) : descsz
  }
  return pvh_address
}


const XEN_ELFNOTE_PHYS32_ENTRY = 18
const ELFNOTE_ALIGN = 4
const vmlinux = read_vmlinux('/dev/shm/vmlinux')
const { entrypoint, program_headers, header } = vmlinux
const off = program_headers[4][0].offset
const sz = program_headers[4][0].file_size
console.log(JSON.stringify(program_headers, null, '  '))
const elf_note_dv = new DataView(header.bytes.buffer, off, sz)
const pvh_u8 = ptr(header.bytes.subarray(off, off + sz))
console.log(dump(pvh_u8))
const pvh_address = parse_elf_note(elf_note_dv, pvh_u8)
console.log(`entrypoint ${entrypoint}`)
console.log(`pvh address ${pvh_address}`)
let kernel_end = 0
for (const segment of program_headers[1]) {
  const off = segment.offset
  const sz = segment.file_size
  const paddr = segment.phys_address // this is where we put the segment bytes in guest memory
  const end = paddr + sz
  if (end > kernel_end) kernel_end = end
  console.log(`load from offset ${off} for ${sz} bytes to ${paddr} in guest memory`)
}
console.log(`kernel_end ${kernel_end}`)
