import styled from 'styled-components'
import { Link } from 'react-router-dom'
import { hoverLongTransitionTiming } from 'styles/commonStyles'

export const Card = styled.div`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  background: transparent;
`

export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  flex-wrap: wrap;
`

export const Bullet = styled.span<{ color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ color }) => color};
  flex: 0 0 8px;
`

export const Title = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`

export const Registry = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
`

export const StatusLabel = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.primaryText};
`

export const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.stroke};
  margin: 0;
`

export const Body = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

export const MetaLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
`

export const InfoRow = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
  flex: 1;
  min-width: 0;
`

export const LabelValue = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
`

export const StyledChainLabel = styled.span`
  margin-bottom: 8px;
`

export const StyledChainContainer = styled(LabelValue)`
  margin-bottom: -8px;
`

export const ViewLink = styled(Link)`
  ${hoverLongTransitionTiming}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.buttonSecondaryBorder};
  color: ${({ theme }) => theme.primaryText};

  &:hover {
    background: ${({ theme }) => theme.hoverBackground};
    border-color: ${({ theme }) => theme.primaryText};
    color: ${({ theme }) => theme.primaryText};
  }
`
