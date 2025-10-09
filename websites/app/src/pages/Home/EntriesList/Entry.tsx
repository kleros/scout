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
import useHumanizedCountdown, {
  useChallengeRemainingTime,
} from 'hooks/countdown'

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
  border-bottom: 2px solid #5a2393;

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
`

const LabelAndValue = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
`

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
  status:
    | 'Registered'
    | 'Absent'
    | 'RegistrationRequested'
    | 'ClearingRequested'
  disputed: boolean
  bounty: string
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

const Entry = React.memo(
  ({
    item,
    challengePeriodDuration,
  }: {
    item: GraphItem
    challengePeriodDuration: number | null
  }) => {
    const [imgLoaded, setImgLoaded] = useState(false)
    const [, setSearchParams] = useSearchParams()
    const scrollTop = useScrollTop()

    const challengeRemainingTime = useChallengeRemainingTime(
      item.requests[0]?.submissionTime,
      item.disputed,
      challengePeriodDuration
    )
    const formattedChallengeRemainingTime = useHumanizedCountdown(
      challengeRemainingTime,
      2
    )

    const handleEntryDetailsClick = useCallback(() => {
      setSearchParams((prev) => {
        const prevParams = prev.toString()
        const newParams = new URLSearchParams(prevParams)
        newParams.append('itemdetails', item.id)
        return newParams
      })
      scrollTop()
    }, [setSearchParams, item.id])

    const getPropValue = (label: string) => {
      return item?.props?.find((prop) => prop.label === label)?.value || ''
    }

    return (
      <Card>
        <Status
          status={item.status}
          disputed={item.disputed}
          bounty={item.requests[0].deposit}
        />
        <CardContent>
          {item.registryAddress === registryMap.Tags_Queries && (
            <>
              <LabelAndValue>
                {getPropValue('EVM Chain ID')}
                <AddressDisplay
                  address={`eip155:${getPropValue('EVM Chain ID')}`}
                />
              </LabelAndValue>
              <div>
                <>{getPropValue('Description')}</>
              </div>
              <b>
                <StyledWebsiteAnchor
                  href={`${getPropValue('Github Repository URL').replace(
                    '.git',
                    ''
                  )}/commit/${getPropValue('Commit hash')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {getPropValue('Github Repository URL')}
                </StyledWebsiteAnchor>
              </b>
            </>
          )}
          {item.registryAddress === registryMap.Single_Tags && (
            <>
              <strong>
                <AddressDisplay address={getPropValue('Contract Address')} />
              </strong>
              <div>{getPropValue('Project Name')}</div>
              <div>{getPropValue('Public Name Tag')}</div>
              <StyledWebsiteAnchor
                href={getPropValue('UI/Website Link')}
                target="_blank"
                rel="noopener noreferrer"
              >
                {getPropValue('UI/Website Link')}
              </StyledWebsiteAnchor>
            </>
          )}
          {item.registryAddress === registryMap.Tokens && (
            <>
              <strong>
                <AddressDisplay address={getPropValue('Address')} />
              </strong>
              {getPropValue('Logo') && (
                <StyledButton
                  onClick={() => {
                    const tokenLogoURI = `https://cdn.kleros.link${getPropValue(
                      'Logo'
                    )}`
                    setSearchParams({ attachment: tokenLogoURI })
                    scrollTop()
                  }}
                >
                  <TokenLogoWrapper>
                    {!imgLoaded && <Skeleton height={100} width={100} />}
                    <img
                      src={`https://cdn.kleros.link${getPropValue('Logo')}`}
                      alt="Logo"
                      onLoad={() => setImgLoaded(true)}
                      style={{ display: imgLoaded ? 'block' : 'none' }}
                    />
                  </TokenLogoWrapper>
                </StyledButton>
              )}
              <div>{getPropValue('Symbol')}</div>
              <div>{getPropValue('Name')}</div>
              {getPropValue('Website') ? (
                <StyledWebsiteAnchor
                  href={getPropValue('Website')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {getPropValue('Website')}
                </StyledWebsiteAnchor>
              ) : null}
            </>
          )}
          {item.registryAddress === registryMap.CDN && (
            <>
              <strong>
                <AddressDisplay address={getPropValue('Contract address')} />
              </strong>
              <StyledWebsiteAnchor
                href={`https://${getPropValue('Domain name')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {getPropValue('Domain name')}
              </StyledWebsiteAnchor>
              {getPropValue('Visual proof') && (
                <StyledButton
                  onClick={() => {
                    const visualProofURI = `https://cdn.kleros.link${getPropValue(
                      'Visual proof'
                    )}`
                    setSearchParams({ attachment: visualProofURI })
                    scrollTop()
                  }}
                >
                  {!imgLoaded && <Skeleton height={100} width={150} />}
                  <VisualProofWrapper
                    src={`https://cdn.kleros.link${getPropValue(
                      'Visual proof'
                    )}`}
                    alt="Visual proof"
                    onLoad={() => setImgLoaded(true)}
                    style={{ display: imgLoaded ? '' : 'none' }}
                  />
                </StyledButton>
              )}
            </>
          )}
          <div style={{ color: '#CD9DFF' }}>
            Submitted on:{' '}
            {formatTimestamp(Number(item?.requests[0].submissionTime), false)}
          </div>
          {formattedChallengeRemainingTime && (
            <div style={{ color: '#CD9DFF' }}>
              Finalises in {formattedChallengeRemainingTime}
            </div>
          )}
          <DetailsButton onClick={handleEntryDetailsClick}>
            Details
          </DetailsButton>
        </CardContent>
      </Card>
    )
  }
)

export default Entry
