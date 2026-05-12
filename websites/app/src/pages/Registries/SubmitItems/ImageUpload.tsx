import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import styled from 'styled-components'
import { Roles, useAtlasProvider } from '@kleros/kleros-app'
import { isPngFile } from 'utils/pngValidation'
import {
  getRoleRestriction,
  validateFileAgainstRestriction,
} from 'utils/atlasUploadRestrictions'
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

const getImageDimensions = (
  file: File,
): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to read image dimensions'))
    }
    img.src = url
  })

const ImageUpload: React.FC<{
  value: File | null
  onChange: (value: File | null) => void
  setImageError: Dispatch<SetStateAction<string | null>>
  registry: string
  role: Roles
  tooltip?: string
}> = ({ value, onChange, setImageError, registry, role, tooltip }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const { roleRestrictions } = useAtlasProvider()
  const restriction = getRoleRestriction(role, roleRestrictions)

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(value)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  const validateImage = async (image: File): Promise<string | null> => {
    if (registry === 'tokens') {
      if (image.size > 1024 * 1024) {
        return 'Logo must not exceed 1MB for Tokens registry.'
      }
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
      try {
        const { width, height } = await getImageDimensions(image)
        if (width < 128 || height < 128) {
          return 'Logo must be at least 128px x 128px for Tokens registry.'
        }
      } catch {
        return 'Could not read image dimensions. Please try a different PNG.'
      }
      return null
    }
    return validateFileAgainstRestriction(image, restriction)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    if (!picked) return
    onChange(picked)
    const error = await validateImage(picked)
    setImageError(error)
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
          accept={
            registry === 'tokens'
              ? '.png'
              : (restriction?.allowedMimeTypes.join(',') ?? 'image/*')
          }
        />
      </StyledLabel>
      {previewUrl && (
        <img width={200} height={200} src={previewUrl} alt="preview" />
      )}
    </>
  )
}

export default ImageUpload
