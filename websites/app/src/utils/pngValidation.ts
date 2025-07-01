/**
 * Validates if a file is actually a PNG by examining its magic number/signature
 * PNG files start with the signature: 89 50 4E 47 0D 0A 1A 0A (8 bytes)
 * @param file - The file to validate
 * @returns Promise<boolean> - True if the file is a valid PNG, false otherwise
 */
export const isPngFile = async (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer
      if (!arrayBuffer || arrayBuffer.byteLength < 8) {
        resolve(false)
        return
      }

      const uint8Array = new Uint8Array(arrayBuffer)
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]

      const isValidPng = pngSignature.every((byte, index) => uint8Array[index] === byte)
      resolve(isValidPng)
    }
    reader.onerror = () => resolve(false)
    reader.readAsArrayBuffer(file.slice(0, 8)) // Only read first 8 bytes for signature check
  })
}

/**
 * Comprehensive PNG validation for file uploads
 * Checks file extension, MIME type, and actual file content
 * @param file - The file to validate
 * @returns Promise<string | null> - Error message if validation fails, null if valid
 */
export const validatePngFile = async (file: File): Promise<string | null> => {
  // Check file extension and MIME type first (basic validation)
  if (!file.type.startsWith('image/png') && !file.name.toLowerCase().endsWith('.png')) {
    return 'Only PNG images are allowed.'
  }

  // Check actual file content to ensure it's a real PNG file
  const isActuallyPng = await isPngFile(file)
  if (!isActuallyPng) {
    return 'Invalid PNG file. The file content does not match PNG format specifications.'
  }

  return null
}