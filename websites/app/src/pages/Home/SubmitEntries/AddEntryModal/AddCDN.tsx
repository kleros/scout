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
import ImageUpload from './ImageUpload'
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
import { references } from 'utils/chains'

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
  const scrollTop = useScrollTop();

  useEffect(() => {
    const caip10AddressParam = searchParams.get('caip10Address');
    const domainParam = searchParams.get('domain');
  
    if (caip10AddressParam) {
      const separatorIndex = caip10AddressParam.lastIndexOf(':');
      const networkIdentifier = caip10AddressParam.substring(0, separatorIndex);
      const walletAddress = caip10AddressParam.substring(separatorIndex + 1);
  
      const networkLabel = references.find(
        (reference) => `${reference.namespaceId}:${reference.id}` === networkIdentifier
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

  const { isLoading: addressIssuesLoading, data: addressIssuesData } = useQuery({
    queryKey: ['addressissues', network.value + ':' + debouncedAddress, 'CDN', domain],
    queryFn: () => getAddressValidationIssue(network.value, debouncedAddress, 'CDN', domain),
    enabled: Boolean(debouncedAddress) || Boolean(domain),
  });

  useEffect(() => {
    setFormData({ network, address, domain, path });
  }, [network, address, domain, path]);

  const submitCDN = async () => {
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
    await initiateTransactionToCurate(
      '0x957a53a994860be4750810131d9c876b2f52d6e1',
      countsData?.CDN.deposits as DepositParams,
      ipfsPath
    );
    clearLocalStorage('addCDNForm');
  }

  const handleClose = () => {
    clearLocalStorage('addCDNForm');
  }

  const submittingDisabled = useMemo(() => {
    return Boolean(!address || !domain || !!addressIssuesData || !!addressIssuesLoading || !path || imageError);
  }, [address, domain, addressIssuesData, addressIssuesLoading, path, imageError]);

  return (
    <AddContainer>
      <AddHeader>
        <div>
          <AddTitle>Submit CDN</AddTitle>
          <AddSubtitle>
            Want to suggest an entry without any deposit?{' '}
            <StyledGoogleFormAnchor
              target="_blank"
              href="https://docs.google.com/forms/d/e/1FAIpQLSeO32UBCpIYu3XIKGM-hLqWu51XcsSG1QRxtuycZPyS9mMtVg/viewform"
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
      Domain
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
        <SubmitButton disabled={submittingDisabled} onClick={submitCDN}>
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

export default AddCDN
