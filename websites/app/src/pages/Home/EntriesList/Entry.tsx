import React, { useState } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import Skeleton from 'react-loading-skeleton'
import { useSearchParams } from 'react-router-dom'
import { formatEther } from 'ethers'
import { GraphItem, Prop, registryMap } from 'utils/fetchItems'
import { StyledWebsiteAnchor } from 'utils/renderValue'
import AddressDisplay from 'components/AddressDisplay'

const Card = styled.div`
  background-color: #3a2154;
  border-radius: 12px;
  color: white;
  font-family: 'Oxanium', sans-serif;
  box-sizing: border-box;
  word-break: break-word;
`

const CardStatus = styled.div<{ status: string }>`
  text-align: center;
  font-weight: bold;
  padding-top: 20px;
  padding-bottom: 15px;
  margin-bottom: 10px;
  border-bottom: 3px solid #08020e;

  &:before {
    content: '';
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-bottom: 0px;
    background-color: ${({ status }) =>
      ({
        Registered: '#90EE90',
        Submitted: '#FFEA00',
        'Challenged Submission': '#E87B35',
        'Challenged Removal': '#E87B35',
        Removed: 'red',
      }[status] || 'gray')};
    border-radius: 50%;
    margin-right: 10px;
  }
`

const CardContent = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px;
  padding-bottom: 20px;
  align-items: center;
`

const TokenLogoWrapper = styled.div`
  display: flex;
  height: 100px;
  justify-content: center;
`

const VisualProofWrapper = styled.img`
    object-fit: cover;
    align-self: stretch;
    width: 90%;
`

const DetailsButton = styled.button`
  background-color: #3a2154;
  font-family: 'Oxanium', sans-serif;
  border-radius: 8px;
  border: 2px solid #fff;
  color: #fff;
  cursor: pointer;
  width: 140px;
  height: 32px;
  font-size: 16px;
  transition: transform 100ms ease-in-out, box-shadow 150ms ease-in-out;

  &:active {
    transform: scale(0.97);
  }
`

interface IEntry {
  item: GraphItem
}

interface IStatus {
  status:
    | 'Registered'
    | 'Absent'
    | 'RegistrationRequested'
    | 'ClearingRequested'
  disputed: boolean
  bounty: string
}

const Status: React.FC<IStatus> = ({ status, disputed, bounty }) => {
  const readableStatusMap = {
    Registered: 'Registered',
    Absent: 'Removed',
    RegistrationRequested: 'Submitted',
    ClearingRequested: 'Removing',
  }
  const challengedStatusMap = {
    RegistrationRequested: 'Challenged Submission',
    ClearingRequested: 'Challenged Removal',
  }
  const label = disputed
    ? challengedStatusMap[status]
    : readableStatusMap[status]

  const readableBounty =
    (status === 'ClearingRequested' || status === 'RegistrationRequested') &&
    !disputed
      ? Number(formatEther(bounty))
      : null

  return (
    <CardStatus status={label}>
      {label}
      {readableBounty ? ' — ' + readableBounty + ' xDAI' : ''}
    </CardStatus>
  )
}

const Entry: React.FC<IEntry> = ({ item }) => {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [, setSearchParams] = useSearchParams()

  const handleEntryDetailsClick = () => {
    setSearchParams((prev) => {
      const prevParams = prev.toString()
      const newParams = new URLSearchParams(prevParams)
      newParams.append('itemdetails', item.id)
      return newParams
    })
  }

  const tokenLogoURI =
    item.registryAddress === registryMap['Tokens'] &&
    `https://cdn.kleros.link${
      (item?.metadata?.props?.find((prop) => prop.label === 'Logo') as Prop)
        ?.value
    }`

  const visualProofURI =
    item.registryAddress === registryMap['CDN'] &&
    `https://cdn.kleros.link${
      (
        item?.metadata?.props?.find(
          (prop) => prop.label === 'Visual proof'
        ) as Prop
      )?.value
    }`

  return (
    <Card>
      <Status
        status={item.status}
        disputed={item.disputed}
        bounty={item.requests[0].deposit}
      />
      <CardContent>
        <strong>
          <AddressDisplay address={item?.metadata?.key0} />
        </strong>
        {item.registryAddress === registryMap['Tags'] && (
          <>
            <div>{item?.metadata?.key2}</div>
            <div>{item?.metadata?.key1}</div>
            <StyledWebsiteAnchor
              href={item?.metadata?.key3}
              target="_blank"
              rel="noopener noreferrer"
            >
              {item?.metadata?.key3}
            </StyledWebsiteAnchor>
          </>
        )}
        {item.registryAddress === registryMap['Tokens'] && (
          <>
            {item?.metadata?.props &&
              item.metadata?.props.find((prop) => prop.label === 'Logo') && (
                <a
                  href={tokenLogoURI}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <TokenLogoWrapper>
                    {!imgLoaded && <Skeleton height={100} width={100} />}
                    <img
                      src={tokenLogoURI}
                      alt="Logo"
                      onLoad={() => setImgLoaded(true)}
                      style={{ display: imgLoaded ? 'block' : 'none' }}
                    />
                  </TokenLogoWrapper>
                </a>
              )}
            <div>{item?.metadata?.key2}</div>
            <div>{item?.metadata?.key1}</div>
          </>
        )}
        {item.registryAddress === registryMap['CDN'] && (
          <>
            <StyledWebsiteAnchor
              href={`https://${item?.metadata?.key1}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {item?.metadata?.key1}
            </StyledWebsiteAnchor>
            {item?.metadata?.props &&
              item?.metadata?.props.find(
                (prop) => prop.label === 'Visual proof'
              ) && (
                <a
                  href={visualProofURI}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {!imgLoaded && <Skeleton height={150} width={300} />}
                  <VisualProofWrapper
                    src={visualProofURI}
                    alt="Visual proof"
                    onLoad={() => setImgLoaded(true)}
                    style={{ display: imgLoaded ? '' : 'none' }}
                  />
                </a>
              )}
          </>
        )}
        <DetailsButton
          onClick={() => {
            handleEntryDetailsClick()
          }}
        >
          Details
        </DetailsButton>
      </CardContent>
    </Card>
  )
}

export default Entry
