import React from 'react'
import styled from 'styled-components'
import SubmittedByLink from 'components/SubmittedByLink'
import { formatTimestamp } from 'utils/formatTimestamp'

const Container = styled.div`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Title = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${({ theme }) => theme.secondaryText};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const Info = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};

  a {
    color: #CD9DFF;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`

interface SubmitterSectionProps {
  requester: string
  submissionTime: string
  resolutionTime?: string
  status: string
  challengeRemainingTime?: string | null
}

const SubmitterSection: React.FC<SubmitterSectionProps> = ({
  requester,
  submissionTime,
  resolutionTime,
  status,
  challengeRemainingTime,
}) => {
  return (
    <Container>
      <Title>Submission Details</Title>
      <Info>
        <div>
          <strong>Submitted by:</strong> <SubmittedByLink address={requester} />
        </div>
        <div>
          <strong>Submitted on:</strong> {formatTimestamp(Number(submissionTime), true)}
        </div>
        {challengeRemainingTime && status !== 'Registered' && (
          <div>
            <strong>Challenge period ends in:</strong> {challengeRemainingTime}
          </div>
        )}
        {status === 'Registered' && resolutionTime && (
          <div>
            <strong>Included on:</strong> {formatTimestamp(Number(resolutionTime), true)}
          </div>
        )}
      </Info>
    </Container>
  )
}

export default SubmitterSection
