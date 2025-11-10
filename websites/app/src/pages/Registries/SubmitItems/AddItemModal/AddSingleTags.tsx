import React, { useEffect, useMemo, useState } from 'react'
import { useLocalStorage, clearLocalStorage } from 'hooks/useLocalStorage'
import { formatEther } from 'viem'
import getAddressValidationIssue from 'utils/validateAddress'
import ipfsPublish from 'utils/ipfsPublish'
import { getIPFSPath } from 'utils/getIPFSPath'
import { useCurateInteractions } from '../../../../hooks/contracts/useCurateInteractions'
import { useItemCountsQuery } from '../../../../hooks/queries'
import { EnsureChain } from '../../../../components/EnsureChain'
import { useQuery } from '@tanstack/react-query'
import { FocusedRegistry } from '../../../../utils/itemCounts'
import RichAddressForm, { NetworkOption } from './RichAddressForm'
import { ClosedButtonContainer } from 'pages/Registries'
import {
  AddContainer,
  AddHeader,
  HeaderActions,
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
  SubmissionButton,
  FieldLabel
} from './index'
import { useDebounce } from 'react-use'
import { useSearchParams } from 'react-router-dom'
import { useAttachment } from 'hooks/useAttachment'
import { registryMap } from 'utils/items'
import { chains } from 'utils/chains'
import { infoToast, errorToast } from 'utils/wrapWithToast'

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
  const openAttachment = useAttachment();

  useEffect(() => {
    const caip10AddressParam = searchParams.get('caip10Address');
    const projectNameParam = searchParams.get('projectName');
    const publicNameTagParam = searchParams.get('publicNameTag');
    const publicNoteParam = searchParams.get('publicNote');
    const websiteParam = searchParams.get('website');
  
    if (caip10AddressParam) {
      const separatorIndex = caip10AddressParam.lastIndexOf(':');
      const networkIdentifier = caip10AddressParam.substring(0, separatorIndex);
      const walletAddress = caip10AddressParam.substring(separatorIndex + 1);
  
      const networkLabel = chains.find(
        (reference) => `${reference.namespace}:${reference.id}` === networkIdentifier
      )?.label;
  
      const networkOption = {
        value: networkIdentifier,
        label: networkLabel,
      };
  
      setNetwork({ ...networkOption, label: networkLabel || '' });
      setAddress(walletAddress);
    }
    if (projectNameParam) setProjectName(projectNameParam);
    if (publicNameTagParam) setPublicNameTag(publicNameTagParam);
    if (publicNoteParam) setPublicNote(publicNoteParam);
    if (websiteParam) setWebsite(websiteParam);
  }, [searchParams]);

  useEffect(() => {
    setFormData({ network, address, projectName, publicNameTag, publicNote, website });
  }, [network, address, projectName, publicNameTag, publicNote, website, setFormData]);

  useDebounce(
    () => {
      setDebouncedAddress(address)
    },
    500,
    [address]
  )

  const networkAddressKey = network.value + ':' + debouncedAddress

  const cacheKey = `addressIssues:${networkAddressKey}:${projectName}:${publicNameTag}:${website}`
  
  const cachedIssues = useMemo(() => {
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null
  
    try {
      return JSON.parse(cached)
    } catch {
      localStorage.removeItem(cacheKey)
      return null
    }
  }, [cacheKey])
  
  const { isLoading: addressIssuesLoading, data: addressIssuesData } = useQuery({
    queryKey: ['addressissues', networkAddressKey, 'Single_Tags', projectName, publicNameTag, website],
    queryFn: async () => {
      const res = await getAddressValidationIssue(
        network.value,
        'Single_Tags',
        debouncedAddress,
        undefined,
        projectName,
        publicNameTag,
        website
      )
      localStorage.setItem(cacheKey, JSON.stringify(res))
      return res
    },
    enabled: Boolean(debouncedAddress) || Boolean(projectName) || Boolean(publicNameTag) || Boolean(website),
    placeholderData: cachedIssues,
  });

  const { data: countsData } = useItemCountsQuery()

  const registry: FocusedRegistry | undefined = useMemo(() => {
    const registryLabel = searchParams.get('additem')
    if (registryLabel === null || !countsData) return undefined
    return countsData[registryLabel]
  }, [searchParams, countsData])

  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const { addItem, isLoading: isContractLoading } = useCurateInteractions();

  // Combined loading state for both IPFS upload and contract interaction
  const isSubmitting = isLocalLoading || isContractLoading;

  const submitAddressTag = async () => {
    if (!countsData?.Single_Tags.deposits) return;

    setIsLocalLoading(true);
    try {
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

      infoToast('Uploading item to IPFS...');
      const enc = new TextEncoder()
      const fileData = enc.encode(JSON.stringify(item))
      const ipfsObject = await ipfsPublish('item.json', fileData)
      const ipfsPath = getIPFSPath(ipfsObject)

      const result = await addItem(
        registryMap.Single_Tags as `0x${string}`,
        ipfsPath,
        countsData.Single_Tags.deposits
      );

      if (result?.status) {
        // Reset form state before clearing localStorage to prevent the useEffect from saving it again
        setNetwork({ value: 'eip155:1', label: 'Mainnet' });
        setAddress('');
        setProjectName('');
        setPublicNameTag('');
        setPublicNote('');
        setWebsite('');
        clearLocalStorage('addTagForm');
        // Close the modal by removing the additem query parameter
        setSearchParams((prev) => {
          const prevParams = prev.toString()
          const newParams = new URLSearchParams(prevParams)
          newParams.delete('additem')
          return newParams
        })
      }
    } catch (error) {
      console.error('Error submitting address tag:', error);
      errorToast(error instanceof Error ? error.message : 'Failed to submit address tag');
    } finally {
      setIsLocalLoading(false);
    }
  }

  const handleClose = () => {
    // Just close - preserve the draft in localStorage for later
  }

    const submittingDisabled = useMemo(() => {
      return Boolean(!address || !projectName || !publicNameTag || !publicNote || !website || !!addressIssuesData || addressIssuesLoading || isSubmitting);
    }, [address, projectName, publicNameTag, publicNote, website, addressIssuesData, addressIssuesLoading, isSubmitting]);
  
  return (
    <AddContainer>
      <AddHeader>
        <div>
          <AddTitle>Submit Address Tag</AddTitle>
          <AddSubtitle>
            Want to suggest an item without any deposit?{' '}
            <StyledGoogleFormAnchor
              target="_blank"
              href="https://docs.google.com/forms/d/e/1FAIpQLSdTwlrcbbPOkSCMKuUj42d_koSAEkWjMLz5hhTc5lB6aGCO9w/viewform"
            >
              Click here
            </StyledGoogleFormAnchor>
          </AddSubtitle>
        </div>
        <HeaderActions>
          {registry && (
            <SubmissionButton
              onClick={() => {
                if (registry.metadata.policyURI) {
                  openAttachment(`https://cdn.kleros.link${registry.metadata.policyURI}`);
                }
              }}
            >
              Submission Guidelines
            </SubmissionButton>
          )}
          <ClosedButtonContainer onClick={handleClose}>
            <CloseButton />
          </ClosedButtonContainer>
        </HeaderActions>
      </AddHeader>
      <Divider />
      <RichAddressForm
        networkOption={network}
        setNetwork={setNetwork}
        address={address}
        setAddress={setAddress}
        registry="Single_Tags"
      />
      {addressIssuesData?.address && (
        <ErrorMessage>{addressIssuesData.address.message}</ErrorMessage>
      )}
      <FieldLabel>Project name</FieldLabel>
      <StyledTextInput
        placeholder="e.g. Kleros"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
      />
      {addressIssuesData?.projectName && (
        <ErrorMessage>{addressIssuesData.projectName.message}</ErrorMessage>
      )}
      <FieldLabel>Public Name Tag</FieldLabel>
      <StyledTextInput
        placeholder="e.g. PNK Merkle Drop"
        value={publicNameTag}
        onChange={(e) => setPublicNameTag(e.target.value)}
      />
      {addressIssuesData?.publicNameTag && (
        <ErrorMessage>{addressIssuesData.publicNameTag.message}</ErrorMessage>
      )}
      <FieldLabel>Public note</FieldLabel>
      <StyledTextInput
        placeholder="e.g. This contract is used for..."
        value={publicNote}
        onChange={(e) => setPublicNote(e.target.value)}
      />
      <FieldLabel>UI/Website link</FieldLabel>
      <StyledTextInput
        placeholder="e.g. https://kleros.io"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />
      {addressIssuesData?.link && (
        <ErrorMessage>{addressIssuesData.link.message}</ErrorMessage>
      )}
      <PayoutsContainer>
        <EnsureChain>
          <SubmitButton disabled={submittingDisabled} onClick={submitAddressTag}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </SubmitButton>
        </EnsureChain>
        <ExpectedPayouts>
          Deposit:{' '}
          {countsData?.['Single_Tags']?.deposits
            ? formatEther(
              countsData['Single_Tags'].deposits.arbitrationCost +
              countsData['Single_Tags'].deposits.submissionBaseDeposit
            ) + ' xDAI'
            : null}{' | '}Expected Reward: $12
        </ExpectedPayouts>
      </PayoutsContainer>
    </AddContainer>
  )
}

export default AddAddressTag
