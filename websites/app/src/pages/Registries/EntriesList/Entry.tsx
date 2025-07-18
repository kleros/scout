import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import Skeleton from 'react-loading-skeleton';
import { useSearchParams } from 'react-router-dom';
import { formatEther } from 'ethers';
import { GraphItem, registryMap } from 'utils/fetchItems';
import { StyledWebsiteAnchor } from 'utils/renderValue';
import AddressDisplay from 'components/AddressDisplay';
import { useScrollTop } from 'hooks/useScrollTop';
import { formatTimestamp } from 'utils/formatTimestamp';
import useHumanizedCountdown, { useChallengeRemainingTime } from 'hooks/countdown';
import { Divider } from 'components/Divider';
import { hoverLongTransitionTiming, hoverShortTransitionTiming } from 'styles/commonStyles';

const Card = styled.div`
  color: white;
  font-family: 'Oxanium', sans-serif;
  box-sizing: border-box;
  word-break: break-word;
  border: 1px solid ${({ theme }) => theme.backgroundTwo};
  border-radius: 12px;

  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const CardStatus = styled.div<{ status: string; }>`
  text-align: center;
  font-weight: 400;
  padding: 14px 20px 12px;
  background-color: ${({ theme }) => theme.lightBackground};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;

  &:before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-bottom: 0px;
    background-color: ${({ status }) =>
  ({
    Included: '#90EE90',
    'Registration Requested': '#FFEA00',
    'Challenged Submission': '#E87B35',
    'Challenged Removal': '#E87B35',
    Removed: 'red',
  }[status] || 'gray')};
    border-radius: 50%;
    margin-right: 10px;
  }
`;

const CardContent = styled.div`
  flex: 1;
  justify-content: space-between;

  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(153, 153, 153, 0.08) 100%
  );
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 0 16px;
  align-items: center;

  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
`;

const UpperCardContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  align-items: center;
  padding: 0 16px;
`;

const BottomCardContent = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: center;
  gap: 8px;
`;

const TokenLogoWrapper = styled.div`
  ${hoverShortTransitionTiming}
  display: flex;
  height: 100px;
  justify-content: center;

  &:hover {
    filter: brightness(0.8);
  }
`;

const VisualProofWrapper = styled.img`
  ${hoverShortTransitionTiming}
  object-fit: cover;
  align-self: stretch;
  width: 90%;
  margin-top: 8px;
  cursor: pointer;

  &:hover {
    filter: brightness(0.8);
  }
`;

const DetailsButton = styled.button`
  ${hoverLongTransitionTiming}
  position: relative;
  margin: 8px 0;
  font-family: 'Oxanium', sans-serif;
  width: 86px;
  padding: 10px 20px;
  font-size: 14px;
  color: ${({ theme }) => theme.primaryText};
  background: transparent;
  border: none;
  cursor: pointer;
  transition: transform 100ms ease-in-out, box-shadow 150ms ease-in-out;

  &:before {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1px;
    border-radius: 9999px;
    background: linear-gradient(270deg, #1C3CF1 0%, #8B5CF6 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    pointer-events: none;
  }

  &:active {
    transform: scale(0.97);
  }

  &:hover {
    filter: brightness(1.2);
    transform: scale(1.03);
  }
`;

const StyledButton = styled.button`
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
`;

const LabelAndValue = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  justify-content: center;
`;

const ChainIdLabel = styled.label`
  margin-bottom: 8px;
`;

const SymbolLabel = styled.label`
  color: ${({ theme }) => theme.primaryText};
  font-weight: 600;
  font-size: 16px;
  margin-top: 4px;
`;

const NameLabel = styled.label`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 16px;
`;

const SubmittedLabel = styled.label`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 12px;
`;

const StyledDivider = styled(Divider)`
  margin-bottom: 8px;
`;

const TimersContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 8px;
  gap: 4px;
`;

const WrappedWebsiteContainer = styled.div`
  margin-top: -8px;
`;

const readableStatusMap = {
  Registered: 'Included',
  Absent: 'Removed',
  RegistrationRequested: 'Registration Requested',
  ClearingRequested: 'Removal Requested',
};

const challengedStatusMap = {
  RegistrationRequested: 'Challenged Submission',
  ClearingRequested: 'Challenged Removal',
};

interface StatusProps {
  status: 'Registered' | 'Absent' | 'RegistrationRequested' | 'ClearingRequested';
  disputed: boolean;
  bounty: string;
}

const Status = React.memo(({ status, disputed, bounty }: StatusProps) => {
  const label = disputed
    ? challengedStatusMap[status]
    : readableStatusMap[status];

  const readableBounty =
    (status === 'ClearingRequested' || status === 'RegistrationRequested') &&
      !disputed
      ? Number(formatEther(bounty))
      : null;

  return (
    <CardStatus status={label}>
      {label}
      {readableBounty ? ` — ${readableBounty} xDAI` : ''}
    </CardStatus>
  );
});

const Entry = React.memo(
  ({ item, challengePeriodDuration }: { item: GraphItem; challengePeriodDuration: number | null; }) => {
    const [imgLoaded, setImgLoaded] = useState(false);
    const [, setSearchParams] = useSearchParams();
    const scrollTop = useScrollTop();

    const challengeRemainingTime = useChallengeRemainingTime(
      item.requests[0]?.submissionTime,
      item.disputed,
      challengePeriodDuration
    );
    const formattedChallengeRemainingTime = useHumanizedCountdown(challengeRemainingTime, 2);

    const handleEntryDetailsClick = useCallback(() => {
      setSearchParams((prev) => {
        const prevParams = prev.toString();
        const newParams = new URLSearchParams(prevParams);
        newParams.append('itemdetails', item.id);
        return newParams;
      });
      scrollTop();
    }, [setSearchParams, item.id]);

    const getPropValue = (label: string) => {
      return item?.metadata?.props?.find((prop) => prop.label === label)?.value || '';
    };

    return (
      <Card>
        <Status
          status={item.status}
          disputed={item.disputed}
          bounty={item.requests[0].deposit}
        />
        <CardContent>
          <UpperCardContent>
            {item.registryAddress === registryMap.Tags_Queries && (
              <>
                <LabelAndValue>
                  <ChainIdLabel>{getPropValue('EVM Chain ID')} </ChainIdLabel>
                  <AddressDisplay address={`eip155:${getPropValue('EVM Chain ID')}`} />
                </LabelAndValue>
                <div>
                  <>{getPropValue('Description')}</>
                </div>
                <b>
                  <StyledWebsiteAnchor
                    href={`${getPropValue('Github Repository URL').replace('.git', '')}/commit/${getPropValue('Commit hash')}`}
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
                <AddressDisplay address={getPropValue('Address')} />
                {getPropValue('Logo') && (
                  <StyledButton
                    onClick={() => {
                      const tokenLogoURI = `https://cdn.kleros.link${getPropValue('Logo')}`;
                      setSearchParams({ attachment: tokenLogoURI });
                      scrollTop();
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
                <SymbolLabel>{getPropValue('Symbol')}</SymbolLabel>
                <NameLabel>{getPropValue('Name')}</NameLabel>
                {getPropValue('Website') ? <StyledWebsiteAnchor
                  href={getPropValue('Website')}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {getPropValue('Website')}
                </StyledWebsiteAnchor> : null}
              </>
            )}
            {item.registryAddress === registryMap.CDN && (
              <>
                <AddressDisplay address={getPropValue('Contract address')} />
                <WrappedWebsiteContainer>
                  <StyledWebsiteAnchor
                    href={`https://${getPropValue('Domain name')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >

                    {getPropValue('Domain name')}
                  </StyledWebsiteAnchor>
                </WrappedWebsiteContainer>
                {getPropValue('Visual proof') && (
                  <StyledButton
                    onClick={() => {
                      const visualProofURI = `https://cdn.kleros.link${getPropValue('Visual proof')}`;
                      setSearchParams({ attachment: visualProofURI });
                      scrollTop();
                    }}
                  >
                    {!imgLoaded && <Skeleton height={100} width={150} />}
                    <VisualProofWrapper
                      src={`https://cdn.kleros.link${getPropValue('Visual proof')}`}
                      alt="Visual proof"
                      onLoad={() => setImgLoaded(true)}
                      style={{ display: imgLoaded ? '' : 'none' }}
                    />
                  </StyledButton>
                )}
              </>
            )}
          </UpperCardContent>
          <BottomCardContent>
            <DetailsButton onClick={handleEntryDetailsClick}>Details</DetailsButton>
            <StyledDivider />
            <TimersContainer>
              {item?.status !== "Registered" ? <SubmittedLabel>
                Submitted on: {formatTimestamp(Number(item?.requests[0].submissionTime), false)}
              </SubmittedLabel> : null}
              {item?.status === "Registered" ? <SubmittedLabel>
                Included on: {formatTimestamp(Number(item?.requests[0].resolutionTime), false)}
              </SubmittedLabel> : null}
              {formattedChallengeRemainingTime && (
                <SubmittedLabel>
                  Will be included in: {formattedChallengeRemainingTime}
                </SubmittedLabel>
              )}
            </TimersContainer>
          </BottomCardContent>
        </CardContent>
      </Card>
    );
  }
);

export default Entry;