import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLocalStorage } from 'hooks/useLocalStorage'
import { useValidationIssues } from 'hooks/useValidationIssues'
import { useCurateSubmit } from 'hooks/useCurateSubmit'
import { parseCaip10 } from 'utils/parseCaip10'
import RichAddressForm, { NetworkOption } from './RichAddressForm'
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
  network: { value: 'eip155:1', label: 'Mainnet' } as NetworkOption,
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

  const { submit, isSubmitting, deposits } = useCurateSubmit({
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
      <ModalHeader
        title="Submit Address Tag"
        googleFormUrl="https://docs.google.com/forms/d/e/1FAIpQLSdTwlrcbbPOkSCMKuUj42d_koSAEkWjMLz5hhTc5lB6aGCO9w/viewform"
      />
      <RichAddressForm
        networkOption={network}
        setNetwork={setNetwork}
        address={address}
        setAddress={setAddress}
        registry="single-tags"
        tooltip={columns[0].description}
      />
      {issues?.address && <ErrorMessage>{issues.address.message}</ErrorMessage>}
      {issues?.duplicate && (
        <ErrorMessage>{issues.duplicate.message}</ErrorMessage>
      )}
      <FieldLabel>
        <Tooltip data-tooltip={columns[2].description}>Project name</Tooltip>
      </FieldLabel>
      <StyledTextInput
        placeholder="e.g. Kleros"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
      />
      {issues?.projectName && (
        <ErrorMessage>{issues.projectName.message}</ErrorMessage>
      )}
      <FieldLabel>
        <Tooltip data-tooltip={columns[1].description}>Public Name Tag</Tooltip>
      </FieldLabel>
      <StyledTextInput
        placeholder="e.g. PNK Merkle Drop"
        value={publicNameTag}
        onChange={(e) => setPublicNameTag(e.target.value)}
      />
      {issues?.publicNameTag && (
        <ErrorMessage>{issues.publicNameTag.message}</ErrorMessage>
      )}
      <FieldLabel>
        <Tooltip data-tooltip={columns[4].description}>Public note</Tooltip>
      </FieldLabel>
      <StyledTextInput
        placeholder="e.g. This contract is used for..."
        value={publicNote}
        onChange={(e) => setPublicNote(e.target.value)}
      />
      <FieldLabel>
        <Tooltip data-tooltip={columns[3].description}>UI/Website link</Tooltip>
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

export default AddAddressTag
