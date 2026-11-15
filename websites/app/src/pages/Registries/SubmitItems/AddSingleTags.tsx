import React, { useEffect, useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLocalStorage } from 'hooks/useLocalStorage'
import { useValidationIssues } from 'hooks/useValidationIssues'
import { useCurateSubmit } from 'hooks/useCurateSubmit'
import { parseCaip10 } from 'utils/parseCaip10'
import RichAddressForm, { NetworkOption } from './RichAddressForm'
import FormHeader from './FormHeader'
import SubmitFooter from './SubmitFooter'
import {
  AddContainer,
  ErrorMessage,
  StyledTextArea,
  StyledTextInput,
  FieldLabel,
  describeIssue,
  singleLineTextAreaProps,
} from './index'

// Help shown next to the labels. The `columns` descriptions are uploaded with the entry, so they
// are left as they are.
const ADDRESS_HELP =
  'The address of the contract being tagged. It is stored in CAIP-10 format with the chain you select.'
const PUBLIC_NOTE_HELP =
  'The Public Note is a short, mandatory comment field used to add a comment/information about the contract that could not fit in the public name tag (e.g. Official Ethereum 2.0 Beacon Chain deposit contract address).'

const columns = [
  {
    label: 'Contract Address',
    description:
      'The address of the smart contract being tagged. Will be store in CAIP-10 format if the chain is properly selected in the UI.',
    type: 'rich address',
    isIdentifier: true,
  },
  {
    label: 'Public Name Tag',
    description:
      'The Public Name tag of a contract address indicates a commonly-used name of the smart contract and clearly identifies it to avoid potential confusion. (e.g. Eth2 Deposit Contract).',
    type: 'text',
    isIdentifier: true,
  },
  {
    label: 'Project Name',
    description:
      'The name of the project that the contract belongs to. Can be omitted only for contracts which do not belong to a project',
    type: 'text',
    isIdentifier: true,
  },
  {
    label: 'UI/Website Link',
    description:
      'The URL of the most popular user interface used to interact with the contract tagged or the URL of the official website of the contract deployer (e.g. https://launchpad.ethereum.org/en/).',
    type: 'link',
    isIdentifier: true,
  },
  {
    label: 'Public Note',
    description:
      'The Public Note is a short, mandatory comment field used to add a comment/information about the contract that could not fit in the public name tag (e.g. Official Ethereum 2.0 Beacon Chain deposit contact address).',
    type: 'text',
  },
]

const DEFAULT_FORM = {
  network: { value: 'eip155:1', label: 'Ethereum Mainnet' } as NetworkOption,
  address: '',
  projectName: '',
  publicNameTag: '',
  publicNote: '',
  website: '',
}

const AddAddressTag: React.FC = () => {
  const [formData, setFormData] = useLocalStorage('addTagForm', DEFAULT_FORM)

  const [network, setNetwork] = useState<NetworkOption>(formData.network)
  const [address, setAddress] = useState<string>(formData.address)
  const [projectName, setProjectName] = useState<string>(formData.projectName)
  const [publicNameTag, setPublicNameTag] = useState<string>(formData.publicNameTag)
  const [publicNote, setPublicNote] = useState<string>(formData.publicNote)
  const [website, setWebsite] = useState<string>(formData.website)
  const [searchParams] = useSearchParams()
  const id = useId()

  useEffect(() => {
    const caip10 = searchParams.get('caip10Address')
    if (caip10) {
      const parsed = parseCaip10(caip10)
      setNetwork(parsed.network)
      setAddress(parsed.address)
    }
    const projectNameParam = searchParams.get('projectName')
    const publicNameTagParam = searchParams.get('publicNameTag')
    const publicNoteParam = searchParams.get('publicNote')
    const websiteParam = searchParams.get('website')
    if (projectNameParam) setProjectName(projectNameParam)
    if (publicNameTagParam) setPublicNameTag(publicNameTagParam)
    if (publicNoteParam) setPublicNote(publicNoteParam)
    if (websiteParam) setWebsite(websiteParam)
  }, [searchParams])

  useEffect(() => {
    setFormData({ network, address, projectName, publicNameTag, publicNote, website })
  }, [network, address, projectName, publicNameTag, publicNote, website, setFormData])

  const { data: issues, isLoading: issuesLoading } = useValidationIssues({
    chainId: network.value,
    registry: 'single-tags',
    address,
    projectName,
    publicNameTag,
    link: website,
  })

  const {
    submit,
    isSubmitting,
    deposits,
    depositsStatus,
    retryDeposits,
    retryingDeposits,
  } = useCurateSubmit({
    registryKey: 'single-tags',
    localStorageKey: 'addTagForm',
    columns,
    onResetForm: () => {
      setNetwork(DEFAULT_FORM.network)
      setAddress('')
      setProjectName('')
      setPublicNameTag('')
      setPublicNote('')
      setWebsite('')
    },
  })

  const submittingDisabled =
    !address ||
    !projectName ||
    !publicNameTag ||
    !publicNote ||
    !website ||
    !!issues ||
    issuesLoading ||
    isSubmitting

  const handleSubmit = () =>
    submit({
      'Contract Address': `${network.value}:${address}`,
      'Public Name Tag': publicNameTag,
      'Project Name': projectName,
      'UI/Website Link': website,
      'Public Note': publicNote,
    })

  return (
    <AddContainer>
      <FormHeader
        title="Submit Address Tag"
        googleFormUrl="https://docs.google.com/forms/d/e/1FAIpQLSdTwlrcbbPOkSCMKuUj42d_koSAEkWjMLz5hhTc5lB6aGCO9w/viewform"
      />
      <RichAddressForm
        networkOption={network}
        setNetwork={setNetwork}
        address={address}
        setAddress={setAddress}
        registry="single-tags"
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
      <FieldLabel htmlFor={`${id}-project`} help={columns[2].description}>
        Project name
      </FieldLabel>
      <StyledTextInput
        id={`${id}-project`}
        placeholder="e.g. Kleros"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        {...describeIssue(`${id}-project-error`, !!issues?.projectName)}
      />
      {issues?.projectName && (
        <ErrorMessage id={`${id}-project-error`}>
          {issues.projectName.message}
        </ErrorMessage>
      )}
      <FieldLabel htmlFor={`${id}-name-tag`} help={columns[1].description}>
        Public Name Tag
      </FieldLabel>
      <StyledTextInput
        id={`${id}-name-tag`}
        placeholder="e.g. PNK Merkle Drop"
        value={publicNameTag}
        onChange={(e) => setPublicNameTag(e.target.value)}
        {...describeIssue(`${id}-name-tag-error`, !!issues?.publicNameTag)}
      />
      {issues?.publicNameTag && (
        <ErrorMessage id={`${id}-name-tag-error`}>
          {issues.publicNameTag.message}
        </ErrorMessage>
      )}
      <FieldLabel htmlFor={`${id}-note`} help={PUBLIC_NOTE_HELP}>
        Public note
      </FieldLabel>
      <StyledTextArea
        id={`${id}-note`}
        rows={2}
        placeholder="e.g. This contract is used for..."
        value={publicNote}
        {...singleLineTextAreaProps(setPublicNote)}
      />
      <FieldLabel htmlFor={`${id}-website`} help={columns[3].description}>
        UI/Website link
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
        registryName="single-tags"
        submitLabel="Submit Tag"
      />
    </AddContainer>
  )
}

export default AddAddressTag
