import React, { useEffect, useMemo, useState } from 'react'
import { useLocalStorage, clearLocalStorage } from 'hooks/useLocalStorage'
import { useQuery } from '@tanstack/react-query'
import { formatEther } from 'viem'
import getAddressValidationIssue from 'utils/validateAddress'
import ipfsPublish from 'utils/ipfsPublish'
import { getIPFSPath } from 'utils/getIPFSPath'
import { FocusedRegistry } from 'utils/itemCounts'
import { useItemCountsQuery } from '../../../../hooks/queries'
import { useCurateInteractions } from '../../../../hooks/contracts/useCurateInteractions'
import { EnsureChain } from '../../../../components/EnsureChain'
import RichAddressForm, { NetworkOption } from './RichAddressForm'
import ImageUpload from './ImageUpload'
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
import { chains } from 'utils/chains'

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

const AddCDN: React.FC = () => {
  const [formData, setFormData] = useLocalStorage('addCDNForm', {
    network: { value: 'eip155:1', label: 'Mainnet' },
    address: '',
    domain: '',
    path: '',
  });

  const [network, setNetwork] = useState<NetworkOption>(formData.network);
  const [address, setAddress] = useState<string>(formData.address);
  const [domain, setDomain] = useState<string>(formData.domain);
  const [path, setPath] = useState<string>(formData.path);

  const [debouncedAddress, setDebouncedAddress] = useState<string>('')
  const [searchParams, setSearchParams] = useSearchParams()
  const [imageError, setImageError] = useState<string | null>(null);
  const openAttachment = useAttachment();

  useEffect(() => {
    const caip10AddressParam = searchParams.get('caip10Address');
    const domainParam = searchParams.get('domain');
  
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
  
    if (domainParam) {
      setDomain(domainParam);
    }
  }, [searchParams]);

  useDebounce(
    () => {
      setDebouncedAddress(address)
    },
    500,
    [address]
  )

  const { data: countsData } = useItemCountsQuery()

  const registry: FocusedRegistry | undefined = useMemo(() => {
    const registryLabel = searchParams.get('additem')
    if (registryLabel === null || !countsData) return undefined
    return countsData[registryLabel]
  }, [searchParams, countsData])

  const networkAddressKey = network.value + ':' + debouncedAddress

  const cacheKey = `addressIssues:${networkAddressKey}:${domain}`
  
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
    queryKey: ['addressissues', networkAddressKey, 'CDN', domain],
    queryFn: async () => {
      const res = await getAddressValidationIssue(network.value, 'CDN', debouncedAddress, domain)
      localStorage.setItem(cacheKey, JSON.stringify(res))
      return res
    },
    enabled: Boolean(debouncedAddress) || Boolean(domain),
    placeholderData: cachedIssues,
  });

  useEffect(() => {
    setFormData({ network, address, domain, path });
  }, [network, address, domain, path, setFormData]);

  const { addItem, isLoading: isSubmitting } = useCurateInteractions();

  const submitCDN = async () => {
    if (!countsData?.CDN.deposits) return;
    
    const values = {
      'Contract address': `${network.value}:${address}`,
      'Domain name': domain,
      'Visual proof': path,
    }
    const item = {
      columns,
      values,
    }
    const enc = new TextEncoder()
    const fileData = enc.encode(JSON.stringify(item))
    const ipfsObject = await ipfsPublish('item.json', fileData)
    const ipfsPath = getIPFSPath(ipfsObject)
    
    await addItem(
      '0x957a53a994860be4750810131d9c876b2f52d6e1' as `0x${string}`,
      ipfsPath,
      countsData.CDN.deposits
    );
    clearLocalStorage('addCDNForm');
  }

  const handleClose = () => {
    clearLocalStorage('addCDNForm');
  }

  const submittingDisabled = useMemo(() => {
    return Boolean(!address || !domain || !!addressIssuesData || !!addressIssuesLoading || !path || imageError || isSubmitting);
  }, [address, domain, addressIssuesData, addressIssuesLoading, path, imageError, isSubmitting]);

  return (
    <AddContainer>
      <AddHeader>
        <div>
          <AddTitle>Submit CDN</AddTitle>
          <AddSubtitle>
            Want to suggest an item without any deposit?{' '}
            <StyledGoogleFormAnchor
              target="_blank"
              href="https://docs.google.com/forms/d/e/1FAIpQLSeO32UBCpIYu3XIKGM-hLqWu51XcsSG1QRxtuycZPyS9mMtVg/viewform"
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
        registry="CDN"
      />
      {addressIssuesData?.address && (
        <ErrorMessage>{addressIssuesData.address.message}</ErrorMessage>
      )}
      <FieldLabel>Domain</FieldLabel>
      <StyledTextInput
        placeholder="e.g. kleros.io"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
      />
      {addressIssuesData?.domain && (
        <ErrorMessage>{addressIssuesData.domain.message}</ErrorMessage>
      )}
      <ImageUpload
        path={path}
        setPath={setPath}
        registry="CDN"
        {...{setImageError}}
      />
      {imageError && <ErrorMessage>{imageError}</ErrorMessage>}
      <PayoutsContainer>
        <EnsureChain>
          <SubmitButton disabled={submittingDisabled} onClick={submitCDN}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </SubmitButton>
        </EnsureChain>
        <ExpectedPayouts>
          Deposit:{' '}
          {countsData?.CDN?.deposits
            ? formatEther(
              countsData.CDN.deposits.arbitrationCost +
              countsData.CDN.deposits.submissionBaseDeposit
            ) + ' xDAI'
            : null}{' | '}Expected Reward: $12
        </ExpectedPayouts>
      </PayoutsContainer>
    </AddContainer>
  )
}

export default AddCDN
