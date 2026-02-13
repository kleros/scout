import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import styled from 'styled-components'
import ipfsPublish from 'utils/ipfsPublish'
import { getIPFSPath } from 'utils/getIPFSPath'
import { isPngFile } from 'utils/pngValidation'
import UploadIcon from 'svgs/icons/upload.svg'
import { FieldLabel } from './index'

const StyledLabel = styled.label`
  cursor: pointer;
  width: fit-content;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: ${({ theme }) => theme.modalInputBackground};
  color: ${({ theme }) => theme.primaryText};
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
  position: relative;
  font-size: 16px;
  font-weight: 400;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.backgroundFour};
  }

  &:active {
    background: ${({ theme }) => theme.backgroundFour};
  }
`

const StyledInput = styled.input`
  opacity: 0;
  width: 0.1px;
  height: 0.1px;
  position: absolute;
`

const StyledUploadIcon = styled(UploadIcon)`
  width: 16px;
  height: 16px;

  path {
    fill: ${({ theme }) => theme.primaryText};
  }
`

const ImageUpload: React.FC<{
  path: string
  setPath: Dispatch<SetStateAction<string>>
  setImageError: Dispatch<SetStateAction<string | null>>
  registry: string
}> = ({ path, setPath, setImageError, registry }) => {
  const [imageFile, setImageFile] = useState<File | null>(null)

  const validateImage = async (file: File): Promise<string | null> => {
    if (registry === 'tokens') {
      // Check file extension and MIME type first (basic validation)
      if (!file.type.startsWith('image/png') && !file.name.toLowerCase().endsWith('.png')) {
        return 'Only PNG images are allowed for Tokens registry.'
      }
      
      // Check actual file content to ensure it's a real PNG file
      const isActuallyPng = await isPngFile(file)
      if (!isActuallyPng) {
        return 'Invalid PNG file. The file content does not match PNG format specifications.'
      }
      
      if (file.size > 4 * 1024 * 1024) {
        return 'Image size should not exceed 4MB.'
      }
    }
    return null
  }

  useEffect(() => {
    if (!imageFile) return
    const uploadImageToIPFS = async () => {
      const error = await validateImage(imageFile)
      if (error) {
        setImageError(error)
        return
      }

      try {
        const data = await imageFile.arrayBuffer()
        const ipfsObject = await ipfsPublish(imageFile.name, data)
        const ipfsPath = getIPFSPath(ipfsObject)
        setPath(ipfsPath)
        setImageError(null)
      } catch (err) {
        setImageError('Failed to upload image. Please try again.')
      }
    }
    uploadImageToIPFS()
  }, [imageFile, registry, setPath, setImageError])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
    }
  }

  return (
    <>
      <FieldLabel>Image</FieldLabel>
      <StyledLabel>
        Upload Image <StyledUploadIcon />
        <StyledInput
          type="file"
          onChange={handleFileChange}
          accept={registry === 'tokens' ? '.png' : 'image/*'}
        />
      </StyledLabel>
      {path && (
        <img
          width={200}
          height={200}
          src={`https://cdn.kleros.link${path}`}
          alt="preview"
        />
      )}
    </>
  )
}

export default ImageUpload
