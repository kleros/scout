import React, { useState } from 'react'
import styled, { css } from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import { landscapeStyle } from 'styles/landscapeStyle'
import EtherscanImg from 'pngs/subgraph-section/etherscan.png'
import MetamaskPopup from 'pngs/subgraph-section/metamask-popup.png'
import KlerosTokensImg from 'pngs/subgraph-section/kleros-tokens.png'
import BackArrow from 'tsx:svgs/subgraph-section/arrow-back.svg'
import ForwardArrow from 'tsx:svgs/subgraph-section/arrow-forward.svg'
import CopyToClipboard from 'tsx:svgs/subgraph-section/copy.svg'
import { Button, ButtonAnchor } from 'components/Button'

const CarouselContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 84vw;
  flex-wrap: wrap;
  gap: 32px;
  margin-top: ${responsiveSize(32, 32)};

  ${landscapeStyle(
    () => css`
      width: auto;
    `
  )}
`

const InnerContent = styled.div`
  display: flex;
  flex-direction: row;
  text-align: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: ${responsiveSize(40, 80)};
  margin-top: ${responsiveSize(4, 32)};
  width: 84vw;
  flex-wrap: wrap;

  ${landscapeStyle(
    () => css`
      width: auto;
    `
  )}
`

const LeftContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 84vw;
  font-family: 'Oxanium', sans-serif;
  flex-wrap: wrap;

  ${landscapeStyle(
    () => css`
      max-width: 256px;
      text-align: left;
      align-items: flex-start;
    `
  )}
`

const MobileArrowsContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 16px;
  cursor: pointer;

  ${landscapeStyle(
    () => css`
      display: none;
    `
  )}
`

const DesktopBackArrow = styled(BackArrow)`
  display: flex;
  cursor: pointer;
  display: none;

  ${landscapeStyle(
    () => css`
      display: flex;
    `
  )}
`

const DesktopForwardArrow = styled(ForwardArrow)`
  display: flex;
  cursor: pointer;
  display: none;

  ${landscapeStyle(
    () => css`
      display: flex;
    `
  )}
`

const Title = styled.h2`
  display: flex;
  color: #fff;
  margin: 0;
`

const Description = styled.p`
  display: flex;
  color: #fff;
  max-width: 240px;
  flex-wrap: wrap;
`

const Tooltip = styled.span`
  background-color: #555;
  color: white;
  text-align: center;
  border-radius: 6px;
  padding: 8px 0;
  font-size: 14px;
  z-index: 1;
  opacity: 0.9;
  transition: opacity 0.3s;
`

const QueryContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
`

const Query = styled.div`
  display: flex;
  width: 200px;
  height: 136px;
  overflow-y: auto;
  font-family: 'Fira Code', monospace;
  text-align: left;
  background-color: #1f1826;
  color: #fff;
  padding: 16px;
  border-radius: 4px;
  flex-wrap: wrap;
  white-space: pre-wrap;
  word-break: break-word;
`

const StyledCopyToClipboard = styled(CopyToClipboard)`
  cursor: pointer;
`

const StyledQueryTitle = styled.p`
  opacity: 0.5;
  margin: 8px 0;
  margin-right: 160px;

  ${landscapeStyle(
    () => css`
      margin-right: 0px;
    `
  )}
`

const Image = styled.img`
  width: ${responsiveSize(280, 400)};
  height: 33%;
`

const StyledButtonAnchor = styled(ButtonAnchor)`
  margin-top: ${responsiveSize(20, 24)};
  margin-right: 84px;

  ${landscapeStyle(
    () => css`
      padding-right: 0;
      margin-right: 0px;
    `
  )}
`

const components = [
  {
    title: 'Contract Address Tags',
    description:
      'Kleros’ Address tags provides crucial contract insights BEFORE interaction.',
    query:
      '{\n  lregistry(id: "0x66260c69d03837016d88c9877e61e08ef74c59f2") {    numberOfRegistered\n    items {\n      status\n      props {\n        label\n        value\n      }\n    }\n  }\n}',
    imageUrl: EtherscanImg,
  },
  {
    title: 'Contract <> Domain Mappings',
    description:
      'Secure users from front-end DNS attacks, phishing, etc. with Kleros’ Contract to Domain Name mappings.',
    query:
      '{\n  lregistry(id: "0x957a53a994860be4750810131d9c876b2f52d6e1") {   numberOfRegistered\n    items {\n      status\n      props {\n        label\n        value\n      }\n    }\n  }\n}',
    imageUrl: MetamaskPopup,
  },
  {
    title: 'Kleros Tokens List',
    description:
      'Use Kleros’ Tokens, the oldest & still functioning TCR in web3.',
    query:
      '{\n  lregistry(id: "0xee1502e29795ef6c2d60f8d7120596abe3bad990") {    numberOfRegistered\n    items {\n      status\n      props {\n        label\n        value\n      }\n    }\n  }\n}',
    imageUrl: KlerosTokensImg,
  },
]

const Carousel = () => {
  const [index, setIndex] = useState(0)
  const [showTooltip, setShowTooltip] = useState(false)

  const handlePrev = () => {
    setIndex((prevIndex) =>
      prevIndex > 0 ? prevIndex - 1 : components.length - 1
    )
  }

  const handleNext = () => {
    setIndex((prevIndex) =>
      prevIndex < components.length - 1 ? prevIndex + 1 : 0
    )
  }

  const handleCopy = async (query) => {
    try {
      await navigator.clipboard.writeText(query)
      setShowTooltip(true)
      setTimeout(() => setShowTooltip(false), 2000)
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  const { title, description, query, imageUrl } = components[index]

  return (
    <CarouselContainer>
      <MobileArrowsContainer>
        <BackArrow onClick={handlePrev} />
        <ForwardArrow onClick={handleNext} />
      </MobileArrowsContainer>
      <DesktopBackArrow onClick={handlePrev} />
      <InnerContent>
        <LeftContent>
          <Title>{title}</Title>
          <Description>{description}</Description>
          <StyledQueryTitle>Subgraph Query</StyledQueryTitle>
          <QueryContainer>
            <Query>{query}</Query>
            <StyledCopyToClipboard onClick={() => handleCopy(query)} />
            {showTooltip && <Tooltip>Copied!</Tooltip>}
          </QueryContainer>
          <StyledButtonAnchor
            href="https://thegraph.com/hosted-service/subgraph/kleros/legacy-curate-xdai"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button>Go to the Subgraph</Button>
          </StyledButtonAnchor>
        </LeftContent>
        <Image src={imageUrl} />
      </InnerContent>
      <DesktopForwardArrow onClick={handleNext} />
    </CarouselContainer>
  )
}

export default Carousel
