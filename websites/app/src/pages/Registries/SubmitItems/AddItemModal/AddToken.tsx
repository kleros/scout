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
    label: 'Address',
    description:
      'The address of the smart contract being tagged. Will be store in CAIP-10 format if the chain is properly selected in the UI.',
    type: 'rich address',
    isIdentifier: true,
  },
  {
    label: 'Name',
    description: 'The name of the token',
    type: 'text',
    isIdentifier: true,
  },
  {
    label: 'Symbol',
    description: 'The symbol/ticker of the token',
    type: 'text',
    isIdentifier: true,
  },
  {
    label: 'Decimals',
    description: 'The number of decimals applicable for this token',
    type: 'number',
  },
  {
    label: 'Logo',
    description: 'The PNG logo of the token (at least 128px X 128px in size',
    type: 'image',
    isIdentifier: false,
  },
  {
    label: 'Website',
    description:
      "The URL of the token project's official website. Its primary source for documentation, token specifications, and team information (e.g. https://chain.link).",
    type: 'link',
    isIdentifier: true,
  },
]

const DEFAULT_FORM = {
  network: { value: 'eip155:1', label: 'Mainnet' } as NetworkOption,
  address: '',
  decimals: '',
  name: '',
  symbol: '',
  path: '',
  website: '',
}

const AddToken: React.FC = () => {
  const [formData, setFormData] = useLocalStorage('addTokenForm', DEFAULT_FORM)

  const [network, setNetwork] = useState<NetworkOption>(formData.network)
  const [address, setAddress] = useState<string>(formData.address)
  const [decimals, setDecimals] = useState<string>(formData.decimals)
  const [name, setName] = useState<string>(formData.name)
  const [symbol, setSymbol] = useState<string>(formData.symbol)
  const [path, setPath] = useState<string>(formData.path)
  const [website, setWebsite] = useState<string>(formData.website)
  const [imageError, setImageError] = useState<string | null>(null)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const caip10 = searchParams.get('caip10Address')
    if (caip10) {
      const parsed = parseCaip10(caip10)
      setNetwork(parsed.network)
      setAddress(parsed.address)
    }
    const decimalsParam = searchParams.get('decimals')
    const nameParam = searchParams.get('name')
    const symbolParam = searchParams.get('symbol')
    const websiteParam = searchParams.get('website')
    if (decimalsParam) setDecimals(decimalsParam)
    if (nameParam) setName(nameParam)
    if (symbolParam) setSymbol(symbolParam)
    if (websiteParam) setWebsite(websiteParam)
  }, [searchParams])

  useEffect(() => {
    setFormData({ network, address, decimals, name, symbol, path, website })
  }, [network, address, decimals, name, symbol, path, website, setFormData])

  const { data: issues, isLoading: issuesLoading } = useValidationIssues({
    chainId: network.value,
    registry: 'tokens',
    address,
    projectName: name,
    link: website,
    symbol,
  })

  const { submit, isSubmitting, deposits } = useCurateSubmit({
    registryKey: 'tokens',
    localStorageKey: 'addTokenForm',
    columns,
    onResetForm: () => {
      setNetwork(DEFAULT_FORM.network)
      setAddress('')
      setDecimals('')
      setName('')
      setSymbol('')
      setPath('')
      setWebsite('')
    },
  })

  const submittingDisabled =
    !address ||
    !decimals ||
    !name ||
    !symbol ||
    !!issues ||
    issuesLoading ||
    !path ||
    !website ||
    !!imageError ||
    isSubmitting

  const handleSubmit = () =>
    submit({
      Address: `${network.value}:${address}`,
      Name: name,
      Symbol: symbol,
      Decimals: decimals,
      Logo: path,
      Website: website,
    })

  return (
    <AddContainer>
      <ModalHeader
        title="Submit Token"
        googleFormUrl="https://docs.google.com/forms/d/e/1FAIpQLSchZ5RBd1Y8RNpGCUGY9tZyQZSBgnN_4B9oLfKeKuer9oxGnA/viewform"
      />
      <RichAddressForm
        networkOption={network}
        setNetwork={setNetwork}
        address={address}
        setAddress={setAddress}
        registry="tokens"
        tooltip={columns[0].description}
      />
      {issues?.address && <ErrorMessage>{issues.address.message}</ErrorMessage>}
      {issues?.duplicate && (
        <ErrorMessage>{issues.duplicate.message}</ErrorMessage>
      )}
      <FieldLabel>
        <Tooltip data-tooltip={columns[3].description}>Decimals</Tooltip>
      </FieldLabel>
      <StyledTextInput
        placeholder="e.g. 18"
        value={decimals}
        onChange={(e) => {
          const value = e.target.value
          if (/^\d*$/.test(value)) setDecimals(value)
        }}
      />
      <FieldLabel>
        <Tooltip data-tooltip={columns[1].description}>Name</Tooltip>
      </FieldLabel>
      <StyledTextInput
        placeholder="e.g. Pinakion"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {issues?.projectName && (
        <ErrorMessage>{issues.projectName.message}</ErrorMessage>
      )}
      <FieldLabel>
        <Tooltip data-tooltip={columns[2].description}>Symbol</Tooltip>
      </FieldLabel>
      <StyledTextInput
        placeholder="e.g. PNK"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
      />
      {issues?.symbol && <ErrorMessage>{issues.symbol.message}</ErrorMessage>}
      <ImageUpload
        path={path}
        setPath={setPath}
        registry="tokens"
        tooltip={columns[4].description}
        setImageError={setImageError}
      />
      {imageError && <ErrorMessage>{imageError}</ErrorMessage>}
      <FieldLabel>
        <Tooltip data-tooltip={columns[5].description}>Website</Tooltip>
      </FieldLabel>
      <StyledTextInput
        placeholder="e.g. https://kleros.io"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />
      {issues?.link && <ErrorMessage>{issues.link.message}</ErrorMessage>}
      <SubmitFooter
        deposits={deposits}
        disabled={submittingDisabled}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </AddContainer>
  )
}

export default AddToken
