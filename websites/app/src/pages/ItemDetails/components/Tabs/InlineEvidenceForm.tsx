import React, { forwardRef, useEffect, useState } from 'react'
import styled, { css } from 'styled-components'
import { useQueryClient } from '@tanstack/react-query'
import { Address } from 'viem'
import { Roles, useAtlasProvider } from '@kleros/kleros-app'

import { landscapeStyle } from 'styles/landscapeStyle'

import { EnsureChain } from 'components/EnsureChain'
import EnsureAuth from 'components/EnsureAuth'
import TransactionButton from 'components/TransactionButton'
import UploadIcon from 'assets/svgs/icons/upload.svg'

import { useCurateInteractions } from 'hooks/contracts/useCurateInteractions'
import { useLocalStorage } from 'hooks/useLocalStorage'
import { queryKeys } from 'hooks/queries/consts'

import { errorToast, infoToast } from 'utils/wrapWithToast'
import { parseWagmiError } from 'utils/parseWagmiError'

const Container = styled.div`
  position: relative;
  padding: 24px;
  border-radius: 12px;
  font-family: "Manrope", sans-serif;
  background: ${({ theme }) => theme.backgroundThree};
  border: 1px solid ${({ theme }) => theme.stroke};
  box-shadow: ${({ theme }) => theme.cardShadow};
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 1;
  // Section break from the evidence list above. Inter-evidence gap is ~36px,
  // so the form needs a visibly larger gap to read as a separate write zone
  // (Gestalt proximity). 32/48px on top of the last card's 20px tail margin
  // lands at ~52/68px total — comfortably above the inter-card spacing.
  margin-top: 32px;
  /* Offset for the sticky page header so scrollIntoView doesn't hide our top edge. */
  scroll-margin-top: 80px;

  ${landscapeStyle(
    () => css`
      margin-top: 48px;
    `
  )}
`

const Heading = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`

const FieldLabel = styled.label`
  font-size: 14px;
  color: ${({ theme }) => theme.primaryText};
`

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.stroke};
  outline: none;
  overflow: auto;
  border-radius: 8px;
  background: ${({ theme }) => theme.modalInputBackground};
  color: ${({ theme }) => theme.primaryText};
  font-family: "Manrope", sans-serif;
  font-size: 16px;
  resize: vertical;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:hover {
    background: ${({ theme }) => theme.backgroundFour};
  }

  &:focus {
    background: ${({ theme }) => theme.backgroundFour};
  }

  &::placeholder {
    color: ${({ theme }) => theme.secondaryText};
  }
`

const FileUploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const FileUploadButton = styled.label`
  cursor: pointer;
  width: fit-content;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: ${({ theme }) => theme.modalInputBackground};
  color: ${({ theme }) => theme.primaryText};
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 400;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.backgroundFour};
    border-color: ${({ theme }) => theme.secondaryBlue}80;
  }

  svg {
    width: 16px;
    height: 16px;

    path {
      fill: ${({ theme }) => theme.primaryText};
    }
  }
`

const HiddenFileInput = styled.input`
  opacity: 0;
  width: 0.1px;
  height: 0.1px;
  position: absolute;
`

const FilePreview = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${({ theme }) => theme.backgroundFour};
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 8px;
  font-size: 13px;
  color: ${({ theme }) => theme.secondaryText};
  width: fit-content;
`

const RemoveFileButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.error};
  cursor: pointer;
  font-size: 16px;
  padding: 0 4px;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.7;
  }
`

const ButtonWrapper = styled.div`
  align-self: flex-start;
  margin-top: 4px;
`

interface InlineEvidenceFormProps {
  registryAddress: Address
  itemID: string
  compositeItemId: string
}

const InlineEvidenceForm = forwardRef<HTMLDivElement, InlineEvidenceFormProps>(({
  registryAddress,
  itemID,
  compositeItemId,
}, ref) => {
  const cacheKey = `inlineEvidenceForm:${registryAddress}:${itemID}`

  const [formData, setFormData] = useLocalStorage(cacheKey, {
    title: '',
    description: '',
    attachedFileBase64: null as string | null,
    attachedFileName: null as string | null,
  })

  const [title, setTitle] = useState<string>(formData.title)
  const [description, setDescription] = useState<string>(formData.description)
  const [attachedFileBase64, setAttachedFileBase64] = useState<string | null>(formData.attachedFileBase64)
  const [attachedFileName, setAttachedFileName] = useState<string | null>(formData.attachedFileName)
  const [isLocalLoading, setIsLocalLoading] = useState(false)

  const { submitEvidence, isLoading: isContractLoading } = useCurateInteractions()
  const { uploadFile } = useAtlasProvider()
  const queryClient = useQueryClient()

  const isLoading = isLocalLoading || isContractLoading

  useEffect(() => {
    setFormData({ title, description, attachedFileBase64, attachedFileName })
  }, [title, description, attachedFileBase64, attachedFileName, setFormData])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachedFileName(file.name)
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result?.toString()
      if (result) setAttachedFileBase64(result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveFile = () => {
    setAttachedFileBase64(null)
    setAttachedFileName(null)
  }

  const attachedFile = attachedFileBase64 && attachedFileName ? (() => {
    try {
      const arr = attachedFileBase64.split(',')
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream'
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8arr = new Uint8Array(n)
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
      }
      return new File([u8arr], attachedFileName, { type: mime })
    } catch (error) {
      console.error('Error converting base64 to file:', error)
      return null
    }
  })() : null

  const handleSubmit = async () => {
    setIsLocalLoading(true)
    try {
      let fileURI: string | null = null
      let fileTypeExtension: string | null = null

      if (attachedFile) {
        infoToast('Uploading file to IPFS...')
        const uploadedPath = await uploadFile(attachedFile, Roles.Evidence)
        if (!uploadedPath) throw new Error('Failed to upload attachment to IPFS.')
        fileURI = uploadedPath
        const extension = attachedFile.name.split('.').pop()
        fileTypeExtension = extension ? `.${extension}` : null
      }

      const evidenceObject: {
        title: string
        description: string
        fileURI?: string
        fileTypeExtension?: string
      } = {
        title,
        description,
      }
      if (fileURI) evidenceObject.fileURI = fileURI
      if (fileTypeExtension) evidenceObject.fileTypeExtension = fileTypeExtension

      infoToast('Uploading evidence to IPFS...')
      const evidenceFile = new File(
        [JSON.stringify(evidenceObject)],
        'evidence.json',
        { type: 'application/json' },
      )
      const ipfsPath = await uploadFile(evidenceFile, Roles.CurateItemFile)
      if (!ipfsPath) throw new Error('Failed to upload evidence to IPFS.')

      const result = await submitEvidence(registryAddress, itemID, ipfsPath)

      if (result?.status) {
        setTitle('')
        setDescription('')
        setAttachedFileBase64(null)
        setAttachedFileName(null)
        localStorage.removeItem(cacheKey)
        queryClient.invalidateQueries({ queryKey: queryKeys.itemDetails(compositeItemId) })
      }
    } catch (error) {
      console.error('Error submitting evidence:', error)
      errorToast(parseWagmiError(error) || 'Failed to submit evidence')
    } finally {
      setIsLocalLoading(false)
    }
  }

  const submitDisabled = !title.trim() || !description.trim()

  return (
    <Container ref={ref}>
      <Heading>Add Your Evidence</Heading>
      <FieldLabel>Title</FieldLabel>
      <TextArea
        rows={1}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={isLoading}
      />
      <FieldLabel>Description</FieldLabel>
      <TextArea
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        disabled={isLoading}
      />
      <FileUploadContainer>
        <FieldLabel>Attach file (Optional)</FieldLabel>
        {!attachedFile ? (
          <FileUploadButton>
            <UploadIcon />
            Choose File
            <HiddenFileInput
              type="file"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </FileUploadButton>
        ) : (
          <FilePreview>
            <span>{attachedFile.name}</span>
            <RemoveFileButton onClick={handleRemoveFile} disabled={isLoading}>
              ×
            </RemoveFileButton>
          </FilePreview>
        )}
      </FileUploadContainer>
      <ButtonWrapper>
        <EnsureChain>
          <EnsureAuth>
            <TransactionButton
              isLoading={isLoading}
              loadingText="Processing..."
              disabled={submitDisabled}
              onClick={handleSubmit}
            >
              Submit
            </TransactionButton>
          </EnsureAuth>
        </EnsureChain>
      </ButtonWrapper>
    </Container>
  )
})

InlineEvidenceForm.displayName = 'InlineEvidenceForm'

export default InlineEvidenceForm
