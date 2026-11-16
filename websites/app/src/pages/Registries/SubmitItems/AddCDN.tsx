import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Roles } from '@kleros/kleros-app'
import { useLocalStorage } from 'hooks/useLocalStorage'
import { useImageStorage } from 'hooks/useImageStorage'
import { useSubmissionChecks } from 'hooks/useSubmissionChecks'
import { useCurateSubmit } from 'hooks/useCurateSubmit'
import { parseCaip10 } from 'utils/parseCaip10'
import { errorToast } from 'utils/wrapWithToast'
import RichAddressForm, { NetworkOption } from './RichAddressForm'
import ImageUpload from './ImageUpload'
import FormHeader from './FormHeader'
import SubmitFooter from './SubmitFooter'
import {
  AddContainer,
  ErrorMessage,
  StyledTextInput,
  FieldLabel,
} from './index'
import Tooltip from 'components/Tooltip'
import { ChecksPanel, FieldChecks } from 'components/SubmissionChecks'

const columns = [
  {
    label: 'Contract address',
    description:
      'The address of the contract in question. Case-sensitive only if required by the blockchain that the address pertains to (e.g. Solana). ',
    type: 'rich address',
    isIdentifier: true,
  },
  {
    label: 'Domain name',
    description:
      'The specific (sub)domain name of the dApp where this contract is meant to be accessed from.  Wildcards (*) are acceptable as part of this field if proof can be shown that the contract is intended to be used across multiple domains.',
    type: 'text',
    isIdentifier: true,
  },
  {
    label: 'Visual proof',
    description:
      'If the domain is a specific root or subdomain, this must be a screenshot of the exact page and setup where this particular address can be interacted from.',
    type: 'image',
    isIdentifier: false,
  },
]

const DEFAULT_FORM = {
  network: { value: 'eip155:1', label: 'Mainnet' } as NetworkOption,
  address: '',
  domain: '',
}

const IMAGE_STORAGE_KEY = 'addCDNForm:image'

const AddCDN: React.FC = () => {
  const [formData, setFormData] = useLocalStorage('addCDNForm', DEFAULT_FORM)
  const [image, setImage] = useImageStorage(IMAGE_STORAGE_KEY, () =>
    errorToast(
      "Couldn't save image to browser storage. You can still submit now, but it won't survive a refresh.",
    ),
  )

  const [network, setNetwork] = useState<NetworkOption>(formData.network)
  const [address, setAddress] = useState<string>(formData.address)
  const [domain, setDomain] = useState<string>(formData.domain)
  const [imageError, setImageError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const caip10 = searchParams.get('caip10Address')
    if (caip10) {
      const parsed = parseCaip10(caip10)
      setNetwork(parsed.network)
      setAddress(parsed.address)
    }
    const domainParam = searchParams.get('domain')
    if (domainParam) setDomain(domainParam)
  }, [searchParams])

  useEffect(() => {
    setFormData({ network, address, domain })
  }, [network, address, domain, setFormData])

  const values = useMemo(
    () => ({
      'Contract address': `${network.value}:${address}`,
      'Domain name': domain,
      'Visual proof': '',
    }),
    [network.value, address, domain],
  )
  const draft = useMemo(
    () => ({
      registry: 'cdn' as const,
      values,
      files: { 'Visual proof': image },
    }),
    [values, image],
  )
  const checks = useSubmissionChecks(draft)
  const applyFix = useCallback((field: string, value: string) => {
    if (field === 'Contract address')
      setAddress(value.slice(value.lastIndexOf(':') + 1))
    else if (field === 'Domain name') setDomain(value)
  }, [])

  const { submit, isSubmitting, deposits } = useCurateSubmit({
    registryKey: 'cdn',
    localStorageKey: 'addCDNForm',
    columns,
    onResetForm: () => {
      setNetwork(DEFAULT_FORM.network)
      setAddress('')
      setDomain('')
      setImage(null)
    },
  })

  const submittingDisabled =
    !address ||
    !domain ||
    checks.blocking ||
    checks.checking ||
    !image ||
    !!imageError ||
    isSubmitting

  const handleSubmit = () =>
    submit(
      values,
      image
        ? { 'Visual proof': { file: image, role: Roles.CurateItemImage } }
        : undefined,
    )

  return (
    <AddContainer>
      <FormHeader
        title="Submit CDN"
        googleFormUrl="https://docs.google.com/forms/d/e/1FAIpQLSeO32UBCpIYu3XIKGM-hLqWu51XcsSG1QRxtuycZPyS9mMtVg/viewform"
      />
      <RichAddressForm
        networkOption={network}
        setNetwork={setNetwork}
        address={address}
        setAddress={setAddress}
        registry="cdn"
        tooltip={columns[0].description}
      />
      <FieldChecks
        results={checks.results}
        field="Contract address"
        onApplyFix={applyFix}
      />
      <FieldLabel>
        <Tooltip data-tooltip={columns[1].description}>Domain</Tooltip>
      </FieldLabel>
      <StyledTextInput
        placeholder="e.g. kleros.io"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
      />
      <FieldChecks
        results={checks.results}
        field="Domain name"
        onApplyFix={applyFix}
      />
      <ImageUpload
        value={image}
        onChange={setImage}
        registry="cdn"
        role={Roles.CurateItemImage}
        tooltip={columns[2].description}
        setImageError={setImageError}
      />
      {imageError && <ErrorMessage>{imageError}</ErrorMessage>}
      <ChecksPanel
        results={checks.results}
        checking={checks.checking}
        onRetry={checks.retry}
        onApplyFix={applyFix}
      />
      <SubmitFooter
        deposits={deposits}
        disabled={submittingDisabled}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        registryName="cdn"
        submitLabel="Submit CDN"
      />
    </AddContainer>
  )
}

export default AddCDN
