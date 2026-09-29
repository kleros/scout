/**
 * Byte-level PNG inspection (no pixel decoding).
 *
 * `structure` follows the automated checks' parser exactly, so a file it
 * rejects here would be challenged automatically as "not a structurally
 * valid PNG". `integrityWarnings` lists extra problems those checks do not
 * test (bad CRCs, impossible header values) that still make decoders,
 * explorers or wallets choke on the file. `imageData` tells whether there is
 * any pixel data (IDAT) at all; without it nothing can display the file.
 */

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

const crc32 = (bytes: Uint8Array, start: number, end: number): number => {
  let crc = 0xffffffff
  for (let i = start; i < end; i++)
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

const readUint32 = (bytes: Uint8Array, offset: number): number =>
  ((bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]) >>>
  0

const chunkType = (bytes: Uint8Array, offset: number): string =>
  String.fromCharCode(
    bytes[offset + 4],
    bytes[offset + 5],
    bytes[offset + 6],
    bytes[offset + 7],
  )

/** Valid bit depths per IHDR colour type (PNG specification, table 11.1). */
const ALLOWED_BIT_DEPTHS: Record<number, number[]> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16],
}

export type PngStructure =
  | { valid: true; width: number; height: number; byteLength: number }
  | { valid: false; reason: string; byteLength: number }

export interface PngInspection {
  structure: PngStructure
  integrityWarnings: string[]
  imageData: boolean
}

export const inspectPng = (bytes: Uint8Array): PngInspection => {
  const byteLength = bytes.length
  const integrityWarnings: string[] = []

  if (byteLength < 33 || SIGNATURE.some((b, i) => bytes[i] !== b)) {
    return {
      structure: {
        valid: false,
        reason: 'The file is missing the PNG signature or header.',
        byteLength,
      },
      integrityWarnings,
      imageData: false,
    }
  }

  let offset = 8
  let width = 0
  let height = 0
  let sawIend = false
  let sawIdat = false
  while (offset + 12 <= byteLength) {
    const length = readUint32(bytes, offset)
    const type = chunkType(bytes, offset)
    const end = offset + 12 + length
    if (end > byteLength) {
      return {
        structure: {
          valid: false,
          reason: `The ${type} chunk is truncated.`,
          byteLength,
        },
        integrityWarnings,
        imageData: sawIdat,
      }
    }
    if (offset === 8 && (type !== 'IHDR' || length !== 13)) {
      return {
        structure: {
          valid: false,
          reason: 'The first chunk is not a 13-byte IHDR header.',
          byteLength,
        },
        integrityWarnings,
        imageData: false,
      }
    }
    if (type === 'IHDR') {
      width = readUint32(bytes, offset + 8)
      height = readUint32(bytes, offset + 12)
      if (offset === 8) {
        const bitDepth = bytes[offset + 16]
        const colorType = bytes[offset + 17]
        if (
          !ALLOWED_BIT_DEPTHS[colorType]?.includes(bitDepth) ||
          bytes[offset + 18] !== 0 ||
          bytes[offset + 19] !== 0 ||
          bytes[offset + 20] > 1 ||
          width === 0 ||
          height === 0
        ) {
          integrityWarnings.push(
            'The PNG header declares values that decoders reject.',
          )
        }
      }
    }
    if (type === 'IDAT') sawIdat = true
    if (
      crc32(bytes, offset + 4, offset + 8 + length) !==
      readUint32(bytes, offset + 8 + length)
    ) {
      integrityWarnings.push(
        `The ${type} chunk has a bad checksum; the file is probably corrupted.`,
      )
    }
    offset = end
    if (type === 'IEND') {
      sawIend = true
      break
    }
  }

  if (!sawIend || offset !== byteLength) {
    return {
      structure: {
        valid: false,
        reason: sawIend
          ? 'Extra bytes follow the end of the PNG (IEND chunk).'
          : 'The PNG end marker (IEND) is missing; the file looks truncated.',
        byteLength,
      },
      integrityWarnings,
      imageData: sawIdat,
    }
  }
  return {
    structure: { valid: true, width, height, byteLength },
    integrityWarnings,
    imageData: sawIdat,
  }
}
