import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLocalStorage } from 'hooks/useLocalStorage'
import { useValidationIssues } from 'hooks/useValidationIssues'
import { useCurateSubmit } from 'hooks/useCurateSubmit'
import { parseCaip10 } from 'utils/parseCaip10'
import RichAddressForm, { NetworkOption } from './RichAddressForm'
import ImageUpload from './ImageUpload'
import ModalHeader from './ModalHeader'
import SubmitFooter from './SubmitFooter'
import {
  AddContainer,
  ErrorMessage,
  StyledTextInput,
  FieldLabel,
} from './index'
import Tooltip from 'components/Tooltip'

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
  path: '',
}

const AddCDN: React.FC = () => {
  const [formData, setFormData] = useLocalStorage('addCDNForm', DEFAULT_FORM)

  const [network, setNetwork] = useState<NetworkOption>(formData.network)
  const [address, setAddress] = useState<string>(formData.address)
  const [domain, setDomain] = useState<string>(formData.domain)
  const [path, setPath] = useState<string>(formData.path)
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
    setFormData({ network, address, domain, path })
  }, [network, address, domain, path, setFormData])

  const { data: issues, isLoading: issuesLoading } = useValidationIssues({
    chainId: network.value,
    registry: 'cdn',
    address,
    domain,
  })

  const { submit, isSubmitting, deposits } = useCurateSubmit({
    registryKey: 'cdn',
    localStorageKey: 'addCDNForm',
    columns,
    onResetForm: () => {
      setNetwork(DEFAULT_FORM.network)
      setAddress('')
      setDomain('')
      setPath('')
    },
  })

  const submittingDisabled =
    !address ||
    !domain ||
    !!issues ||
    issuesLoading ||
    !path ||
    !!imageError ||
    isSubmitting

  const handleSubmit = () =>
    submit({
      'Contract address': `${network.value}:${address}`,
      'Domain name': domain,
      'Visual proof': path,
    })

  return (
    <AddContainer>
      <ModalHeader
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
      {issues?.address && <ErrorMessage>{issues.address.message}</ErrorMessage>}
      <FieldLabel>
        <Tooltip data-tooltip={columns[1].description}>Domain</Tooltip>
      </FieldLabel>
      <StyledTextInput
        placeholder="e.g. kleros.io"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
      />
      {issues?.domain && <ErrorMessage>{issues.domain.message}</ErrorMessage>}
      {issues?.duplicate && (
        <ErrorMessage>{issues.duplicate.message}</ErrorMessage>
      )}
      <ImageUpload
        path={path}
        setPath={setPath}
        registry="cdn"
        tooltip={columns[2].description}
        setImageError={setImageError}
      />
      {imageError && <ErrorMessage>{imageError}</ErrorMessage>}
      <SubmitFooter
        deposits={deposits}
        disabled={submittingDisabled}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </AddContainer>
  )
}

export default AddCDN
