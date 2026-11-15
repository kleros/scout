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

// Help shown next to the address label. The `columns` descriptions are uploaded with the entry,
// so they are left as they are.
const ADDRESS_HELP =
  "The token's contract address. It is stored in CAIP-10 format with the chain you select."

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
    description:
      'The PNG logo of the token (at least 128px x 128px in size, max 1MB).',
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
  network: { value: 'eip155:1', label: 'Ethereum Mainnet' } as NetworkOption,
  address: '',
  decimals: '',
  name: '',
  symbol: '',
  website: '',
}

const IMAGE_STORAGE_KEY = 'addTokenForm:image'

const AddToken: React.FC = () => {
  const [formData, setFormData] = useLocalStorage('addTokenForm', DEFAULT_FORM)
  const [image, setImage] = useImageStorage(IMAGE_STORAGE_KEY, () =>
    errorToast(
      "Couldn't save image to browser storage. You can still submit now, but it won't survive a refresh.",
    ),
  )

  const [network, setNetwork] = useState<NetworkOption>(formData.network)
  const [address, setAddress] = useState<string>(formData.address)
  const [decimals, setDecimals] = useState<string>(formData.decimals)
  const [name, setName] = useState<string>(formData.name)
  const [symbol, setSymbol] = useState<string>(formData.symbol)
  const [website, setWebsite] = useState<string>(formData.website)
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
    setFormData({ network, address, decimals, name, symbol, website })
  }, [network, address, decimals, name, symbol, website, setFormData])

  const { data: issues, isLoading: issuesLoading } = useValidationIssues({
    chainId: network.value,
    registry: 'tokens',
    address,
    projectName: name,
    link: website,
    symbol,
  })

  const {
    submit,
    isSubmitting,
    deposits,
    depositsStatus,
    retryDeposits,
    retryingDeposits,
  } = useCurateSubmit({
    registryKey: 'tokens',
    localStorageKey: 'addTokenForm',
    columns,
    onResetForm: () => {
      setNetwork(DEFAULT_FORM.network)
      setAddress('')
      setDecimals('')
      setName('')
      setSymbol('')
      setWebsite('')
      setImage(null)
    },
  })

  const submittingDisabled =
    !address ||
    !decimals ||
    !name ||
    !symbol ||
    !!issues ||
    issuesLoading ||
    !image ||
    !website ||
    !!imageError ||
    isSubmitting

  const handleSubmit = () =>
    submit(
      {
        Address: `${network.value}:${address}`,
        Name: name,
        Symbol: symbol,
        Decimals: decimals,
        Logo: '',
        Website: website,
      },
      image ? { Logo: { file: image, role: Roles.Logo } } : undefined,
    )

  return (
    <AddContainer>
      <FormHeader
        title="Submit Token"
        googleFormUrl="https://docs.google.com/forms/d/e/1FAIpQLSchZ5RBd1Y8RNpGCUGY9tZyQZSBgnN_4B9oLfKeKuer9oxGnA/viewform"
      />
      <RichAddressForm
        networkOption={network}
        setNetwork={setNetwork}
        address={address}
        setAddress={setAddress}
        registry="tokens"
        tooltip={ADDRESS_HELP}
        inputId={`${id}-address`}
        errorId={
          issues?.address
            ? `${id}-address-error`
            : issues?.duplicate
              ? `${id}-duplicate-error`
              : undefined
        }
      />
      {issues?.address && (
        <ErrorMessage id={`${id}-address-error`}>
          {issues.address.message}
        </ErrorMessage>
      )}
      {issues?.duplicate && (
        <ErrorMessage id={`${id}-duplicate-error`}>
          {issues.duplicate.message}
        </ErrorMessage>
      )}
      <FieldLabel htmlFor={`${id}-decimals`} help={columns[3].description}>
        Decimals
      </FieldLabel>
      <StyledTextInput
        id={`${id}-decimals`}
        placeholder="e.g. 18"
        inputMode="numeric"
        value={decimals}
        onChange={(e) => {
          const value = e.target.value
          if (/^\d*$/.test(value)) setDecimals(value)
        }}
      />
      <FieldLabel htmlFor={`${id}-name`} help={columns[1].description}>
        Name
      </FieldLabel>
      <StyledTextInput
        id={`${id}-name`}
        placeholder="e.g. Pinakion"
        value={name}
        onChange={(e) => setName(e.target.value)}
        {...describeIssue(`${id}-name-error`, !!issues?.projectName)}
      />
      {issues?.projectName && (
        <ErrorMessage id={`${id}-name-error`}>
          {issues.projectName.message}
        </ErrorMessage>
      )}
      <FieldLabel htmlFor={`${id}-symbol`} help={columns[2].description}>
        Symbol
      </FieldLabel>
      <StyledTextInput
        id={`${id}-symbol`}
        placeholder="e.g. PNK"
        autoCorrect="off"
        spellCheck={false}
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        {...describeIssue(`${id}-symbol-error`, !!issues?.symbol)}
      />
      {issues?.symbol && (
        <ErrorMessage id={`${id}-symbol-error`}>
          {issues.symbol.message}
        </ErrorMessage>
      )}
      <ImageUpload
        value={image}
        onChange={setImage}
        registry="tokens"
        role={Roles.Logo}
        label="Logo"
        buttonLabel="Upload logo"
        hint="PNG, at least 128 × 128 px, max 1 MB."
        setImageError={setImageError}
        errorId={imageError ? `${id}-image-error` : undefined}
      />
      {imageError && (
        <ErrorMessage id={`${id}-image-error`}>{imageError}</ErrorMessage>
      )}
      <FieldLabel htmlFor={`${id}-website`} help={columns[5].description}>
        Website
      </FieldLabel>
      <StyledTextInput
        id={`${id}-website`}
        placeholder="e.g. https://kleros.io"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        {...describeIssue(`${id}-website-error`, !!issues?.link)}
      />
      {issues?.link && (
        <ErrorMessage id={`${id}-website-error`}>
          {issues.link.message}
        </ErrorMessage>
      )}
      <SubmitFooter
        deposits={deposits}
        depositsStatus={depositsStatus}
        onRetryDeposits={retryDeposits}
        retryingDeposits={retryingDeposits}
        disabled={submittingDisabled}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        registryName="tokens"
        submitLabel="Submit Token"
      />
    </AddContainer>
  )
}

export default AddToken
