import React, { useEffect, useMemo, useState } from 'react'
import { useLocalStorage, clearLocalStorage } from 'hooks/useLocalStorage'
import { useQuery } from '@tanstack/react-query'
import { formatEther } from 'ethers'
import getAddressValidationIssue from 'utils/validateAddress'
import ipfsPublish from 'utils/ipfsPublish'
import { getIPFSPath } from 'utils/getIPFSPath'
import { initiateTransactionToCurate } from 'utils/initiateTransactionToCurate'
import { FocusedRegistry, fetchItemCounts } from 'utils/itemCounts'
import { DepositParams } from 'utils/fetchRegistryDeposits'
import RichAddressForm, { NetworkOption } from './RichAddressForm'
import { ClosedButtonContainer } from 'pages/Home'
import {
  AddContainer,
  AddHeader,
  AddSubtitle,
  AddTitle,
  CloseButton,
  ErrorMessage,
  StyledGoogleFormAnchor,
  StyledTextInput,
  SubmitButton,
  ExpectedPayouts,
  PayoutsContainer,
  Divider,
  SubmissionButton
} from './index'
import { useDebounce } from 'react-use'
import { useSearchParams } from 'react-router-dom'
import { useScrollTop } from 'hooks/useScrollTop'
import { registryMap } from 'utils/fetchItems'

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

const AddAddressTag: React.FC = () => {
  const [formData, setFormData] = useLocalStorage('addTagForm', {
    network: { value: 'eip155:1', label: 'Mainnet' },
    address: '',
    projectName: '',
    publicNameTag: '',
    publicNote: '',
    website: '',
  });

  const [network, setNetwork] = useState<NetworkOption>(formData.network);
  const [address, setAddress] = useState<string>(formData.address);
  const [projectName, setProjectName] = useState<string>(formData.projectName);
  const [publicNameTag, setPublicNameTag] = useState<string>(formData.publicNameTag);
  const [publicNote, setPublicNote] = useState<string>(formData.publicNote);
  const [website, setWebsite] = useState<string>(formData.website);

  const [searchParams, setSearchParams] = useSearchParams()
  const [debouncedAddress, setDebouncedAddress] = useState<string>('')
  const scrollTop = useScrollTop();

  useEffect(() => {
    const networkParam = searchParams.get('network');
    const addressParam = searchParams.get('address');
    const projectNameParam = searchParams.get('projectName');
    const publicNameTagParam = searchParams.get('publicNameTag');
    const publicNoteParam = searchParams.get('publicNote');
    const websiteParam = searchParams.get('website');

    if (networkParam) {
      const networkOption = { value: networkParam, label: networkParam.split(':')[1] || 'Custom' };
      setNetwork(networkOption);
    }
    if (addressParam) setAddress(addressParam);
    if (projectNameParam) setProjectName(projectNameParam);
    if (publicNameTagParam) setPublicNameTag(publicNameTagParam);
    if (publicNoteParam) setPublicNote(publicNoteParam);
    if (websiteParam) setWebsite(websiteParam);
  }, [searchParams]);

  useEffect(() => {
    setFormData({ network, address, projectName, publicNameTag, publicNote, website });
  }, [network, address, projectName, publicNameTag, publicNote, website]);

  useDebounce(
    () => {
      setDebouncedAddress(address)
    },
    500,
    [address]
  )

  const { isLoading: addressIssuesLoading, data: addressIssuesData } = useQuery({
    queryKey: ['addressissues', network.value + ':' + debouncedAddress, 'Tags', projectName, publicNameTag, website],
    queryFn: () => getAddressValidationIssue(network.value, debouncedAddress, 'Tags', undefined, projectName, publicNameTag, website),
    enabled: Boolean(debouncedAddress) || Boolean(projectName) || Boolean(publicNameTag) || Boolean(website),
  });

  const {
    data: countsData,
  } = useQuery({
    queryKey: ['counts'],
    queryFn: () => fetchItemCounts(),
    staleTime: Infinity,
  })

  const registry: FocusedRegistry | undefined = useMemo(() => {
    const registryLabel = searchParams.get('registry')
    if (registryLabel === null || !countsData) return undefined
    return countsData[registryLabel]
  }, [searchParams, countsData])

  const submitAddressTag = async () => {
    const values = {
      'Contract Address': `${network.value}:${address}`,
      'Public Name Tag': publicNameTag,
      'Project Name': projectName,
      'UI/Website Link': website,
      'Public Note': publicNote,
    }
    const item = {
      columns,
      values,
    }
    const enc = new TextEncoder()
    const fileData = enc.encode(JSON.stringify(item))
    const ipfsObject = await ipfsPublish('item.json', fileData)
    const ipfsPath = getIPFSPath(ipfsObject)
    await initiateTransactionToCurate(
      registryMap.Tags,
      countsData?.Tags.deposits as DepositParams,
      ipfsPath
    )
    clearLocalStorage('addTagForm');
  }

  const handleClose = () => {
    clearLocalStorage('addTagForm');
  }

    const submittingDisabled = useMemo(() => {
      return Boolean(!address || !projectName || !publicNameTag || !publicNote || !website || !!addressIssuesData || addressIssuesLoading);
    }, [address, projectName, publicNameTag, publicNote, website, addressIssuesData, addressIssuesLoading]);
  
  return (
    <AddContainer>
      <AddHeader>
        <div>
          <AddTitle>Submit Address Tag</AddTitle>
          <AddSubtitle>
            Want to suggest an entry without any deposit?{' '}
            <StyledGoogleFormAnchor
              target="_blank"
              href="https://docs.google.com/forms/d/e/1FAIpQLSdTwlrcbbPOkSCMKuUj42d_koSAEkWjMLz5hhTc5lB6aGCO9w/viewform"
            >
              Click here
            </StyledGoogleFormAnchor>
          </AddSubtitle>
        </div>
        {registry && (
          <SubmissionButton
            onClick={() => {
              if (registry.metadata.policyURI) {
                setSearchParams({ attachment: `https://cdn.kleros.link${registry.metadata.policyURI}` });
                scrollTop();
              }
            }}
          >
            Submission Guidelines
          </SubmissionButton>
        )}
        <ClosedButtonContainer onClick={handleClose}>
          <CloseButton />
        </ClosedButtonContainer>
      </AddHeader>
      <Divider />
      <RichAddressForm
        networkOption={network}
        setNetwork={setNetwork}
        address={address}
        setAddress={setAddress}
        registry="Tags"
      />
      {addressIssuesData?.address && (
        <ErrorMessage>{addressIssuesData.address.message}</ErrorMessage>
      )}
      Project name
      <StyledTextInput
        placeholder="e.g. Kleros"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
      />
      {addressIssuesData?.projectName && (
        <ErrorMessage>{addressIssuesData.projectName.message}</ErrorMessage>
      )}
      Public Name Tag
      <StyledTextInput
        placeholder="e.g. PNK Merkle Drop"
        value={publicNameTag}
        onChange={(e) => setPublicNameTag(e.target.value)}
      />
      {addressIssuesData?.publicNameTag && (
        <ErrorMessage>{addressIssuesData.publicNameTag.message}</ErrorMessage>
      )}
      Public note
      <StyledTextInput
        placeholder="e.g. This contract is used for..."
        value={publicNote}
        onChange={(e) => setPublicNote(e.target.value)}
      />
      UI/Website link
      <StyledTextInput
        placeholder="e.g. https://kleros.io"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />
      {addressIssuesData?.link && (
        <ErrorMessage>{addressIssuesData.link.message}</ErrorMessage>
      )}
      <PayoutsContainer>
        <SubmitButton disabled={submittingDisabled} onClick={submitAddressTag}>
          Submit
        </SubmitButton>
        <ExpectedPayouts>
          Deposit:{' '}
          {countsData?.Tags?.deposits
            ? formatEther(
              countsData.Tags.deposits.arbitrationCost +
              countsData.Tags.deposits.submissionBaseDeposit
            ) + ' xDAI'
            : null}{' | '}Expected Reward: $12
        </ExpectedPayouts>
      </PayoutsContainer>
    </AddContainer>
  )
}

export default AddAddressTag
