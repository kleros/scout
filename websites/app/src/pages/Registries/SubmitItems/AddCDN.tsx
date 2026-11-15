import React, { useEffect, useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Roles } from '@kleros/kleros-app'
import { useLocalStorage } from 'hooks/useLocalStorage'
import { useImageStorage } from 'hooks/useImageStorage'
import { useValidationIssues } from 'hooks/useValidationIssues'
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
  describeIssue,
} from './index'

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
  network: { value: 'eip155:1', label: 'Ethereum Mainnet' } as NetworkOption,
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
  const id = useId()

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

  const { data: issues, isLoading: issuesLoading } = useValidationIssues({
    chainId: network.value,
    registry: 'cdn',
    address,
    domain,
  })

  const {
    submit,
    isSubmitting,
    deposits,
    depositsStatus,
    retryDeposits,
    retryingDeposits,
  } = useCurateSubmit({
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
    !!issues ||
    issuesLoading ||
    !image ||
    !!imageError ||
    isSubmitting

  const handleSubmit = () =>
    submit(
      {
        'Contract address': `${network.value}:${address}`,
        'Domain name': domain,
        'Visual proof': '',
      },
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
        inputId={`${id}-address`}
        errorId={issues?.address ? `${id}-address-error` : undefined}
      />
      {issues?.address && (
        <ErrorMessage id={`${id}-address-error`}>
          {issues.address.message}
        </ErrorMessage>
      )}
      <FieldLabel htmlFor={`${id}-domain`} help={columns[1].description}>
        Domain
      </FieldLabel>
      <StyledTextInput
        id={`${id}-domain`}
        placeholder="e.g. kleros.io"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        {...describeIssue(
          issues?.domain ? `${id}-domain-error` : `${id}-duplicate-error`,
          !!(issues?.domain || issues?.duplicate),
        )}
      />
      {issues?.domain && (
        <ErrorMessage id={`${id}-domain-error`}>
          {issues.domain.message}
        </ErrorMessage>
      )}
      {issues?.duplicate && (
        <ErrorMessage id={`${id}-duplicate-error`}>
          {issues.duplicate.message}
        </ErrorMessage>
      )}
      <ImageUpload
        value={image}
        onChange={setImage}
        registry="cdn"
        role={Roles.CurateItemImage}
        label="Visual proof"
        buttonLabel="Upload screenshot"
        hint="A screenshot of the page on this domain where the contract is used."
        withSizeLimit
        tooltip={columns[2].description}
        setImageError={setImageError}
        errorId={imageError ? `${id}-image-error` : undefined}
      />
      {imageError && (
        <ErrorMessage id={`${id}-image-error`}>{imageError}</ErrorMessage>
      )}
      <SubmitFooter
        deposits={deposits}
        depositsStatus={depositsStatus}
        onRetryDeposits={retryDeposits}
        retryingDeposits={retryingDeposits}
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
