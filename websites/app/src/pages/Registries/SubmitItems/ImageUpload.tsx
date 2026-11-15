import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import styled from 'styled-components'
import { Roles, useAtlasProvider } from '@kleros/kleros-app'
import { isPngFile } from 'utils/pngValidation'
import {
  formatMb,
  getRoleRestriction,
  validateFileAgainstRestriction,
} from 'utils/atlasUploadRestrictions'
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

  /* The file input itself is invisible: show the keyboard focus ring on the button around it. */
  &:has(input:focus-visible) {
    outline: 2px solid ${({ theme }) => theme.klerosUIComponentsPrimaryBlue};
    outline-offset: 2px;
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

const Hint = styled.p`
  margin: -6px 0 0;
  font-size: 13px;
  line-height: 18px;
  color: ${({ theme }) => theme.secondaryText};
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

type Restriction = ReturnType<typeof getRoleRestriction>

const ImageUpload: React.FC<{
  value: File | null
  onChange: (value: File | null) => void
  setImageError: Dispatch<SetStateAction<string | null>>
  registry: string
  role: Roles
  /** What the field is, e.g. "Logo". */
  label: string
  /** The button text, e.g. "Upload logo". */
  buttonLabel: string
  /** The requirements, always visible under the label. */
  hint?: string
  /** Append the upload service's size limit for this kind of file to the hint ("Max 5 MB."). */
  withSizeLimit?: boolean
  tooltip?: string
  /** Id of the message that explains what is wrong with the file, when there is one. */
  errorId?: string
}> = ({
  value,
  onChange,
  setImageError,
  registry,
  role,
  label,
  buttonLabel,
  hint,
  withSizeLimit = false,
  tooltip,
  errorId,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFailed, setPreviewFailed] = useState(false)
  const { roleRestrictions } = useAtlasProvider()
  const restriction = getRoleRestriction(role, roleRestrictions)
  const hintId = `${useId()}-hint`
  /** The file (and the rules it was checked against) whose result is already shown. */
  const checked = useRef<{ file: File; restriction: Restriction } | null>(null)

  useEffect(() => {
    setPreviewFailed(false)
    if (!value) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(value)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  const validateImage = async (
    image: File,
    rules: Restriction,
  ): Promise<string | null> => {
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
    return validateFileAgainstRestriction(image, rules)
  }

  // A file restored from an earlier visit (or checked before the upload rules had loaded) is
  // checked again, so a file that breaks the rules keeps blocking Submit after a reload.
  useEffect(() => {
    if (!value) {
      checked.current = null
      setImageError(null)
      return
    }
    if (
      checked.current?.file === value &&
      checked.current.restriction === restriction
    )
      return
    let cancelled = false
    validateImage(value, restriction).then((error) => {
      if (cancelled) return
      checked.current = { file: value, restriction }
      setImageError(error)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, restriction])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0]
    if (!picked) return
    // Check first, so the file and its result appear together.
    const error = await validateImage(picked, restriction)
    checked.current = { file: picked, restriction }
    setImageError(error)
    onChange(picked)
  }

  const fullHint =
    withSizeLimit && restriction
      ? `${hint ?? ''} Max ${formatMb(restriction.maxSize)} MB.`.trim()
      : hint
  const describedBy = [fullHint ? hintId : null, errorId]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <FieldLabel help={tooltip}>{label}</FieldLabel>
      {fullHint ? <Hint id={hintId}>{fullHint}</Hint> : null}
      <StyledLabel>
        {buttonLabel} <StyledUploadIcon aria-hidden="true" />
        <StyledInput
          type="file"
          onChange={handleFileChange}
          aria-describedby={describedBy || undefined}
          aria-invalid={errorId ? true : undefined}
          accept={
            registry === 'tokens'
              ? '.png'
              : (restriction?.allowedMimeTypes.join(',') ?? 'image/*')
          }
        />
      </StyledLabel>
      {previewUrl && !previewFailed && (
        <img
          width={200}
          height={200}
          src={previewUrl}
          alt={`Selected ${label.toLowerCase()}`}
          onError={() => setPreviewFailed(true)}
        />
      )}
    </>
  )
}

export default ImageUpload
