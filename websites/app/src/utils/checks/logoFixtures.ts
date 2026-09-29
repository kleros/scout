/**
 * PNG logos for tests: real, empty and corrupt pixel data, and a stand-in for
 * the browser's image decoder. Test-only; the app never imports this.
 */
import { crc32, deflateSync, inflateSync } from 'node:zlib'

const chunk = (type: string, data: Uint8Array) => {
  const out = new Uint8Array(12 + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length)
  out.set(new TextEncoder().encode(type), 4)
  out.set(data, 8)
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

/**
 * A logo file: 8-bit RGBA with real deflated pixel rows unless `idat` says
 * otherwise (null for none), padded with a text chunk to `size` bytes.
 */
export const logoFile = (
  width: number,
  height: number,
  {
    idat = deflateSync(new Uint8Array(height * (1 + width * 4))),
    size,
  }: { idat?: Uint8Array | null; size?: number } = {},
) => {
  const ihdr = new Uint8Array(13)
  const view = new DataView(ihdr.buffer)
  view.setUint32(0, width)
  view.setUint32(4, height)
  ihdr.set([8, 6, 0, 0, 0], 8)
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    ...(idat ? [chunk('IDAT', idat)] : []),
  ]
  const length = parts.reduce((n, p) => n + p.length, 0) + 12
  if (size) parts.push(chunk('tEXt', new Uint8Array(size - length - 12)))
  parts.push(chunk('IEND', new Uint8Array()))
  return new File(parts, 'logo.png', { type: 'image/png' })
}

/**
 * Stands in for the browser's decoder: like one, it fails when the pixel
 * data doesn't inflate to the image the header declares.
 */
export const decodePng = async (blob: Blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const view = new DataView(bytes.buffer)
  const width = view.getUint32(16)
  const height = view.getUint32(20)
  const idat: Uint8Array[] = []
  for (let offset = 8; offset + 12 <= bytes.length; ) {
    const length = view.getUint32(offset)
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
    if (type === 'IDAT')
      idat.push(bytes.subarray(offset + 8, offset + 8 + length))
    offset += 12 + length
  }
  const undecodable = () =>
    new DOMException(
      'The source image could not be decoded.',
      'InvalidStateError',
    )
  let pixels: Uint8Array
  try {
    pixels = inflateSync(Buffer.concat(idat))
  } catch {
    throw undecodable()
  }
  if (pixels.length !== height * (1 + width * 4)) throw undecodable()
  return { width, height, close: () => undefined }
}
