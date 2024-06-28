import React, { useMemo, useState } from 'react'
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
]

const AddToken: React.FC = () => {
  const [network, setNetwork] = useState<NetworkOption>({
    value: 'eip155:1',
    label: 'Mainnet',
  })
  const [address, setAddress] = useState<string>('')
  const [searchParams, setSearchParams] = useSearchParams()
  const [debouncedAddress, setDebouncedAddress] = useState<string>('')

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

  const { isLoading: addressIssuesLoading, data: addressIssuesData } = useQuery(
    {
      queryKey: ['addressissues', networkAddressKey, 'Tokens', '-'],
      queryFn: () =>
        getAddressValidationIssue(network.value, debouncedAddress, 'Tokens'),
      enabled: !!debouncedAddress,
    }
  )

  const [decimals, setDecimals] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [symbol, setSymbol] = useState<string>('')
  const [path, setPath] = useState<string>('')

  const {
    isLoading: countsLoading,
    error: countsError,
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
    )
  }

  const submittingDisabled =
    !address ||
    !decimals ||
    !name ||
    !symbol ||
    !!addressIssuesData ||
    !!addressIssuesLoading ||
    !path

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
              href={`https://cdn.kleros.link${registry.metadata.policyURI}`}
              target="_blank"
            >
              Submission Guidelines
        </SubmissionButton>
        )}
        <ClosedButtonContainer>
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
      {addressIssuesLoading && 'Loading...'}
      {addressIssuesData && !addressIssuesLoading && (
        <ErrorMessage>{addressIssuesData.message}</ErrorMessage>
      )}
      Decimals
      <StyledTextInput
        placeholder="decimals"
        value={decimals}
        onChange={(e) => setDecimals(e.target.value)}
      />
      Name
      <StyledTextInput
        placeholder="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      Symbol
      <StyledTextInput
        placeholder="symbol"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
      />
      <ImageUpload path={path} setPath={setPath} />
      <PayoutsContainer>
        <SubmitButton disabled={submittingDisabled} onClick={submitToken}>
          Submit
        </SubmitButton>
        <ExpectedPayouts>
          Deposit:{' '}
          {countsData?.Tags?.deposits
            ? formatEther(
              countsData.Tags.deposits.arbitrationCost +
              countsData.Tags.deposits.submissionBaseDeposit
            ) + ' xDAI'
            : null}{' | '}Expected Reward: $40
        </ExpectedPayouts>
      </PayoutsContainer>
    </AddContainer>
  )
}

export default AddToken
