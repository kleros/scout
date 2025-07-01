import React, { useEffect, useMemo, useState } from 'react'
import { useLocalStorage, clearLocalStorage } from 'hooks/useLocalStorage'
import { useQuery } from '@tanstack/react-query'
import { formatEther } from 'ethers'
import getAddressValidationIssue from 'utils/validateAddress'
import ipfsPublish from 'utils/ipfsPublish'
import { getIPFSPath } from 'utils/getIPFSPath'
import { FocusedRegistry, fetchItemCounts } from 'utils/itemCounts'
import { initiateTransactionToCurate } from 'utils/initiateTransactionToCurate'
import { DepositParams } from 'utils/fetchRegistryDeposits'
import { useDebounce } from 'react-use'
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
import { useSearchParams } from 'react-router-dom'
import { useScrollTop } from 'hooks/useScrollTop'
import { chains } from 'utils/chains'

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
  const scrollTop = useScrollTop();

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
  }, [network, address, decimals, name, symbol, path, website]);

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
    return cached ? JSON.parse(cached) : null
  }, [cacheKey])

  const { isLoading: addressIssuesLoading, data: addressIssuesData } = useQuery({
    queryKey: ['addressissues', networkAddressKey, 'Tokens', name, symbol, website],
    queryFn: async () => {
      const res = await getAddressValidationIssue(
        network.value,
        'Tokens',
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

  const submitToken = async () => {
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
    const enc = new TextEncoder()
    const fileData = enc.encode(JSON.stringify(item))
    const ipfsObject = await ipfsPublish('item.json', fileData)
    const ipfsPath = getIPFSPath(ipfsObject)
    await initiateTransactionToCurate(
      '0xee1502e29795ef6c2d60f8d7120596abe3bad990',
      countsData?.Tokens.deposits as DepositParams,
      ipfsPath
    );
    clearLocalStorage('addTokenForm');
  }

  const handleClose = () => {
    clearLocalStorage('addTokenForm');
  }

  const submittingDisabled = useMemo(() => {
    return Boolean(!address || !decimals || !name || !symbol || !!addressIssuesData || !!addressIssuesLoading || !path || !website || imageError);
  }, [address, decimals, name, symbol, addressIssuesData, addressIssuesLoading, path, website, imageError]);

  return (
    <AddContainer>
      <AddHeader>
        <div>
          <AddTitle>Submit Token</AddTitle>
          <AddSubtitle>
            Want to suggest an entry without any deposit?{' '}
            <StyledGoogleFormAnchor
              target="_blank"
              href="https://docs.google.com/forms/d/e/1FAIpQLSchZ5RBd1Y8RNpGCUGY9tZyQZSBgnN_4B9oLfKeKuer9oxGnA/viewform"
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
        registry="Tokens"
      />
      {addressIssuesData?.address && (
        <ErrorMessage>{addressIssuesData.address.message}</ErrorMessage>
      )}
      Decimals
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
      Name
      <StyledTextInput
        placeholder="e.g. Pinakion"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      {addressIssuesData?.projectName && (
        <ErrorMessage>{addressIssuesData.projectName.message}</ErrorMessage>
      )}
      Symbol
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
        registry="Tokens"
        {...{setImageError}}
      />
      {imageError && <ErrorMessage>{imageError}</ErrorMessage>}
      Website
      <StyledTextInput
        placeholder="e.g. https://kleros.io"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />
      {addressIssuesData?.link && (
        <ErrorMessage>{addressIssuesData.link.message}</ErrorMessage>
      )}
      <PayoutsContainer>
        <SubmitButton disabled={submittingDisabled} onClick={submitToken}>
          Submit
        </SubmitButton>
        <ExpectedPayouts>
          Deposit:{' '}
          {countsData?.Tokens?.deposits
            ? formatEther(
              countsData.Tokens.deposits.arbitrationCost +
              countsData.Tokens.deposits.submissionBaseDeposit
            ) + ' xDAI'
            : null}{' | '}Expected Reward: $12
        </ExpectedPayouts>
      </PayoutsContainer>
    </AddContainer>
  )
}

export default AddToken