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
import { useDebounce } from 'react-use'
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
import { useSearchParams } from 'react-router-dom'
import { chains } from 'utils/chains'
import { infoToast, errorToast } from 'utils/wrapWithToast'
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
    label: "Website",
    description: "The URL of the token project's official website. Its primary source for documentation, token specifications, and team information (e.g. https://chain.link).",
    type: "link",
    isIdentifier: true
  }
]

const AddToken: React.FC = () => {
  const [formData, setFormData] = useLocalStorage('addTokenForm', {
    network: { value: 'eip155:1', label: 'Mainnet' },
    address: '',
    decimals: '',
    name: '',
    symbol: '',
    path: '',
    website: '',
  });

  const [network, setNetwork] = useState<NetworkOption>(formData.network);
  const [address, setAddress] = useState<string>(formData.address);
  const [decimals, setDecimals] = useState<string>(formData.decimals);
  const [name, setName] = useState<string>(formData.name);
  const [symbol, setSymbol] = useState<string>(formData.symbol);
  const [path, setPath] = useState<string>(formData.path);
  const [website, setWebsite] = useState<string>(formData.website);

  const [searchParams, setSearchParams] = useSearchParams()
  const [debouncedAddress, setDebouncedAddress] = useState<string>('')
  const [imageError, setImageError] = useState<string | null>(null);


  useEffect(() => {
    const caip10AddressParam = searchParams.get('caip10Address');
    const decimalsParam = searchParams.get('decimals');
    const nameParam = searchParams.get('name');
    const symbolParam = searchParams.get('symbol');
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
    if (decimalsParam) setDecimals(decimalsParam);
    if (nameParam) setName(nameParam);
    if (symbolParam) setSymbol(symbolParam);
    if (websiteParam) setWebsite(websiteParam);
  }, [searchParams]);

  useEffect(() => {
    setFormData({ network, address, decimals, name, symbol, path, website });
  }, [network, address, decimals, name, symbol, path, website, setFormData]);

  useDebounce(
    () => {
      setDebouncedAddress(address)
    },
    500,
    [address]
  )

  const networkAddressKey = useMemo(() => {
    return network.value + ':' + debouncedAddress
  }, [network.value, debouncedAddress])

  const cacheKey = `addressIssues:${networkAddressKey}:${name}:${symbol}:${website}`

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
    queryKey: ['addressissues', networkAddressKey, 'tokens', name, symbol, website],
    queryFn: async () => {
      const res = await getAddressValidationIssue(
        network.value,
        'tokens',
        debouncedAddress,
        undefined,
        name,
        undefined,
        website,
        symbol
      )
      localStorage.setItem(cacheKey, JSON.stringify(res))
      return res
    },
    enabled: Boolean(debouncedAddress) || Boolean(name) || Boolean(symbol) || Boolean(website),
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

  const submitToken = async () => {
    if (!countsData?.['tokens']?.deposits) return;

    setIsLocalLoading(true);
    try {
      const values = {
        Address: `${network.value}:${address}`,
        Name: name,
        Symbol: symbol,
        Decimals: decimals,
        Logo: path,
        Website: website,
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
        '0xee1502e29795ef6c2d60f8d7120596abe3bad990' as `0x${string}`,
        ipfsPath,
        countsData['tokens'].deposits
      );

      if (result?.status) {
        // Reset form state before clearing localStorage to prevent the useEffect from saving it again
        setNetwork({ value: 'eip155:1', label: 'Mainnet' });
        setAddress('');
        setDecimals('');
        setName('');
        setSymbol('');
        setPath('');
        setWebsite('');
        clearLocalStorage('addTokenForm');
        // Close the modal by removing the additem query parameter
        setSearchParams((prev) => {
          const prevParams = prev.toString()
          const newParams = new URLSearchParams(prevParams)
          newParams.delete('additem')
          return newParams
        })
      }
    } catch (error) {
      console.error('Error submitting token:', error);
      errorToast(error instanceof Error ? error.message : 'Failed to submit token');
    } finally {
      setIsLocalLoading(false);
    }
  }

  const handleClose = () => {
    // Just close - preserve the draft in localStorage for later
  }

  const submittingDisabled = useMemo(() => {
    return Boolean(!address || !decimals || !name || !symbol || !!addressIssuesData || !!addressIssuesLoading || !path || !website || imageError || isSubmitting);
  }, [address, decimals, name, symbol, addressIssuesData, addressIssuesLoading, path, website, imageError, isSubmitting]);

  return (
    <AddContainer>
      <AddHeader>
        <div>
          <AddTitle>Submit Token</AddTitle>
          <AddSubtitle>
            Want to suggest an item without any deposit?{' '}
            <StyledGoogleFormAnchor
              target="_blank"
              href="https://docs.google.com/forms/d/e/1FAIpQLSchZ5RBd1Y8RNpGCUGY9tZyQZSBgnN_4B9oLfKeKuer9oxGnA/viewform"
            >
              Click here
            </StyledGoogleFormAnchor>
          </AddSubtitle>
        </div>
        <HeaderActions>
          {registry && (
            <SubmissionButton
              href={`https://cdn.kleros.link${registry.metadata.policyURI}`}
              target="_blank"
              rel="noopener noreferrer"
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
        registry="tokens"
        tooltip={columns[0].description}
      />
      {addressIssuesData?.address && (
        <ErrorMessage>{addressIssuesData.address.message}</ErrorMessage>
      )}
      {addressIssuesData?.duplicate && (
        <ErrorMessage>{addressIssuesData.duplicate.message}</ErrorMessage>
      )}
      <FieldLabel><Tooltip data-tooltip={columns[3].description}>Decimals</Tooltip></FieldLabel>
      <StyledTextInput
        placeholder="e.g. 18"
        value={decimals}
        onChange={(e) => {
          const value = e.target.value;
          if (/^\d*$/.test(value)) {
            setDecimals(value);
          }
        }}
      />
      <FieldLabel><Tooltip data-tooltip={columns[1].description}>Name</Tooltip></FieldLabel>
      <StyledTextInput
        placeholder="e.g. Pinakion"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {addressIssuesData?.projectName && (
        <ErrorMessage>{addressIssuesData.projectName.message}</ErrorMessage>
      )}
      <FieldLabel><Tooltip data-tooltip={columns[2].description}>Symbol</Tooltip></FieldLabel>
      <StyledTextInput
        placeholder="e.g. PNK"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
      />
      {addressIssuesData?.symbol && (
        <ErrorMessage>{addressIssuesData.symbol.message}</ErrorMessage>
      )}
      <ImageUpload
        path={path}
        setPath={setPath}
        registry="tokens"
        tooltip={columns[4].description}
        {...{setImageError}}
      />
      {imageError && <ErrorMessage>{imageError}</ErrorMessage>}
      <FieldLabel><Tooltip data-tooltip={columns[5].description}>Website</Tooltip></FieldLabel>
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
          <SubmitButton disabled={submittingDisabled} onClick={submitToken}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </SubmitButton>
        </EnsureChain>
        <ExpectedPayouts>
          Deposit:{' '}
          {countsData?.['tokens']?.deposits
            ? formatEther(
              countsData['tokens'].deposits.arbitrationCost +
              countsData['tokens'].deposits.submissionBaseDeposit
            ) + ' xDAI'
            : null}
        </ExpectedPayouts>
      </PayoutsContainer>
    </AddContainer>
  )
}

export default AddToken