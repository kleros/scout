import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import MetamaskIcon from 'tsx:svgs/promo-banner/metamask.svg'
import RightArrow from 'tsx:svgs/promo-banner/right-arrow.svg'

const Container = styled.div`
  display: flex;
  background-color: #1e003b;
  color: #cd9dff;
  width: 100%;
  font-size: 14px;
  align-items: center;
  justify-content: center;
  font-family: 'Avenir', sans-serif;
  gap: 8px 0;
  flex-wrap: wrap;
  padding: 8px 0;
  text-align: center;
  cursor: pointer;
`

const StyledP = styled.p`
  margin: 0 24px;

  ${landscapeStyle(
    () =>
      css`
        margin: 0 8px;
      `
  )}
`

export const installSnap = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_requestSnaps',
      params: {
        'npm:@kleros/scout-snap': { version: '1.1.0' },
      },
    })
  } catch (error) {
    console.error(error)
  }
}

const PromoBanner: React.FC = () => (
  <Container onClick={installSnap}>
    <MetamaskIcon />
    <StyledP>
      Protect yourself by installing the Kleros Scout Snap on your MetaMask
      Wallet
    </StyledP>
    <RightArrow />
  </Container>
)

export default PromoBanner
