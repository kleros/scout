import React, { Dispatch, SetStateAction } from 'react'
import styled from 'styled-components'
import { isPngFile } from 'utils/pngValidation'
import { fileToBase64 } from 'utils/imageBase64'
import UploadIcon from 'svgs/icons/upload.svg'
import { FieldLabel } from './index'
import Tooltip from 'components/Tooltip'

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

export interface ImageValue {
  base64: string
  name: string
}

const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024

const ImageUpload: React.FC<{
  value: ImageValue | null
  onChange: (value: ImageValue | null) => void
  setImageError: Dispatch<SetStateAction<string | null>>
  registry: string
  tooltip?: string
}> = ({ value, onChange, setImageError, registry, tooltip }) => {
  const validateImage = async (image: File): Promise<string | null> => {
    if (image.size > MAX_IMAGE_SIZE_BYTES) {
      return 'Image size should not exceed 4MB.'
    }
    if (registry === 'tokens') {
      if (
        !image.type.startsWith('image/png') &&
        !image.name.toLowerCase().endsWith('.png')
      ) {
        return 'Only PNG images are allowed for Tokens registry.'
      }

      const isActuallyPng = await isPngFile(image)
      if (!isActuallyPng) {
        return 'Invalid PNG file. The file content does not match PNG format specifications.'
      }
    }
    return null
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    if (!picked) return
    const error = await validateImage(picked)
    if (error) {
      setImageError(error)
      onChange(null)
      return
    }
    try {
      const base64 = await fileToBase64(picked)
      setImageError(null)
      onChange({ base64, name: picked.name })
    } catch {
      setImageError('Failed to read image file.')
      onChange(null)
    }
  }

  return (
    <>
      <FieldLabel>
        {tooltip ? <Tooltip data-tooltip={tooltip}>Image</Tooltip> : 'Image'}
      </FieldLabel>
      <StyledLabel>
        Upload Image <StyledUploadIcon />
        <StyledInput
          type="file"
          onChange={handleFileChange}
          accept={registry === 'tokens' ? '.png' : 'image/*'}
        />
      </StyledLabel>
      {value && (
        <img width={200} height={200} src={value.base64} alt="preview" />
      )}
    </>
  )
}

export default ImageUpload
