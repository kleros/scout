import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import styled from 'styled-components'
import { Roles, useAtlasProvider } from '@kleros/kleros-app'
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

  // Registry rules (PNG format, size, dimensions) are evaluated by the
  // pre-submission checks; here we only enforce what Atlas accepts for upload.
  const validateImage = async (image: File): Promise<string | null> =>
    validateFileAgainstRestriction(image, restriction)

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
