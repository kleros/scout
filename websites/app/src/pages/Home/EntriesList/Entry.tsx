import React, { useCallback, useMemo, useState } from 'react'
import styled from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import { useSearchParams } from 'react-router-dom'
import { formatEther } from 'ethers'
import { GraphItem, Prop, registryMap } from 'utils/fetchItems'
import { StyledWebsiteAnchor } from 'utils/renderValue'
import AddressDisplay from 'components/AddressDisplay'
import { useScrollTop } from 'hooks/useScrollTop'
import { formatTimestamp } from 'utils/formatTimestamp'
import useHumanizedCountdown, { useChallengeRemainingTime } from 'hooks/countdown'

const Card = styled.div`
  background-color: #321c49;
  border-radius: 12px;
  color: white;
  font-family: 'Oxanium', sans-serif;
  box-sizing: border-box;
  word-break: break-word;
`

const CardStatus = styled.div<{ status: string }>`
  text-align: center;
  font-weight: bold;
  padding: 15px 20px;
  margin-bottom: 10px;
  border-bottom: 2px solid #5A2393;

  &:before {
    content: '';
    display: inline-block;
    width: 10px;
    height: 10px;
    margin-bottom: 0px;
    background-color: ${({ status }) =>
      ({
        Registered: '#90EE90',
        'Registration Requested': '#FFEA00',
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
const StyledButton = styled.button`
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
`;

const readableStatusMap = {
  Registered: 'Registered',
  Absent: 'Removed',
  RegistrationRequested: 'Registration Requested',
  ClearingRequested: 'Removal Requested',
}

const challengedStatusMap = {
  RegistrationRequested: 'Challenged Submission',
  ClearingRequested: 'Challenged Removal',
}

interface StatusProps {
  status: 'Registered' | 'Absent' | 'RegistrationRequested' | 'ClearingRequested';
  disputed: boolean;
  bounty: string;
}

const Status = React.memo(({ status, disputed, bounty }: StatusProps) => {
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
      {readableBounty ? ` — ${readableBounty} xDAI` : ''}
    </CardStatus>
  )
})

const Entry = React.memo(({ item, challengePeriodDuration }: { item: GraphItem, challengePeriodDuration: number | null }) => {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [, setSearchParams] = useSearchParams()
  const scrollTop = useScrollTop()
  
  const challengeRemainingTime = useChallengeRemainingTime(item.requests[0]?.submissionTime, item.disputed, challengePeriodDuration)
  const formattedChallengeRemainingTime = useHumanizedCountdown(challengeRemainingTime, 2)

  const handleEntryDetailsClick = useCallback(() => {
    setSearchParams((prev) => {
      const prevParams = prev.toString()
      const newParams = new URLSearchParams(prevParams)
      newParams.append('itemdetails', item.id)
      return newParams
    })
  }, [setSearchParams, item.id])

  const tokenLogoURI = useMemo(() => 
    item.registryAddress === registryMap.Tokens &&
    `https://cdn.kleros.link${
      (item?.metadata?.props?.find((prop) => prop.label === 'Logo') as Prop)
        ?.value
    }`,
    [item]
  )

  const visualProofURI = useMemo(() => 
    item.registryAddress === registryMap.CDN &&
    `https://cdn.kleros.link${
      (
        item?.metadata?.props?.find(
          (prop) => prop.label === 'Visual proof'
        ) as Prop
      )?.value
    }`,
    [item]
  )

  return (
    <Card>
      <Status
        status={item.status}
        disputed={item.disputed}
        bounty={item.requests[0].deposit}
      />
      <CardContent>
        {item.registryAddress === registryMap.Tags_Queries ? (
          <AddressDisplay address={`eip155:${item?.metadata?.key2}` || ''} />
        ) :
          <strong>
            <AddressDisplay address={item?.metadata?.key0 || ''} />
          </strong>
        }
        {item.registryAddress === registryMap.Single_Tags && (
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
        {item.registryAddress === registryMap.Tags_Queries && (
          <>
            <div><b><u>{item?.metadata?.props?.[1]?.value}</u></b></div>
            <StyledWebsiteAnchor
              href={`${item?.metadata?.key0.replace('.git', '')}/commit/${item?.metadata?.key1}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {item?.metadata?.key0}
            </StyledWebsiteAnchor>
          </>
        )}
        {item.registryAddress === registryMap.Tokens && (
          <>
            {item?.metadata?.props &&
              item.metadata?.props.find((prop) => prop.label === 'Logo') && (
                <StyledButton
                  onClick={() => {
                    if (tokenLogoURI) {
                      setSearchParams({ attachment: tokenLogoURI });
                      scrollTop();
                    }
                  }}
                >
                  <TokenLogoWrapper>
                    {!imgLoaded && <Skeleton height={100} width={100} />}
                    <img
                      src={tokenLogoURI || undefined}
                      alt="Logo"
                      onLoad={() => setImgLoaded(true)}
                      style={{ display: imgLoaded ? 'block' : 'none' }}
                    />
                  </TokenLogoWrapper>
                </StyledButton>
              )}
            <div>{item?.metadata?.key2}</div>
            <div>{item?.metadata?.key1}</div>
          </>
        )}
        {item.registryAddress === registryMap.CDN && (
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
                <StyledButton
                  onClick={() => {
                    if (visualProofURI) {
                      setSearchParams({ attachment: visualProofURI });
                      scrollTop();
                    }
                  }}
                >
                  {!imgLoaded && <Skeleton height={100} width={150} />}
                  <VisualProofWrapper
                    src={visualProofURI || undefined}
                    alt="Visual proof"
                    onLoad={() => setImgLoaded(true)}
                    style={{ display: imgLoaded ? '' : 'none' }}
                  />
                </StyledButton>
              )}
          </>
        )}
        <div style={{color: "#CD9DFF"}}>Submitted on: {formatTimestamp(Number(item?.requests[0].submissionTime), false)}</div>
        {formattedChallengeRemainingTime && (
          <div style={{color: "#CD9DFF"}}>Finalises in {formattedChallengeRemainingTime}</div>
        )}
        <DetailsButton onClick={handleEntryDetailsClick}>
          Details
        </DetailsButton>
      </CardContent>
    </Card>
  )
})

export default Entry
