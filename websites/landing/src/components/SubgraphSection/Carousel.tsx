import React, { useEffect, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import { landscapeStyle } from 'styles/landscapeStyle'
import EtherscanImg from 'pngs/subgraph-section/etherscan.png'
import MetamaskPopup from 'pngs/subgraph-section/metamask-popup.png'
import KlerosTokensImg from 'pngs/subgraph-section/kleros-tokens.png'
import BackArrow from 'svgs/subgraph-section/arrow-back.svg'
import ForwardArrow from 'svgs/subgraph-section/arrow-forward.svg'
import CopyToClipboard from 'svgs/subgraph-section/copy.svg'
import { ButtonLink } from 'components/Button'

const CarouselContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 84vw;
  flex-wrap: wrap;
  gap: 36px;
  margin-top: ${responsiveSize(32, 32)};

  ${landscapeStyle(
    () => css`
      width: auto;
      flex-wrap: nowrap;
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

  ${landscapeStyle(
    () => css`
      width: auto;
      flex: 1 1 auto;
      min-width: 0;
      flex-wrap: nowrap;
    `
  )}
`

const LeftContent = styled.div`
  display: flex;
  flex-direction: column;
  width: 84vw;
  min-width: 0;
  font-family: 'Manrope', sans-serif;
  align-items: flex-start;

  ${landscapeStyle(
    () => css`
      width: auto;
      text-align: left;
    `
  )}
`

const ArrowButton = styled.button`
  display: flex;
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
`

const MobileArrowsContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 16px;

  ${landscapeStyle(
    () => css`
      display: none;
    `
  )}
`

const DesktopArrowButton = styled(ArrowButton)<{ $direction: 'back' | 'forward' }>`
  display: none;
  transition: opacity 0.2s ease, transform 0.2s ease;

  &:hover {
    opacity: 0.7;
    transform: translateX(${({ $direction }) => ($direction === 'back' ? '-4px' : '4px')});
  }

  ${landscapeStyle(
    () => css`
      display: flex;
    `
  )}
`

const Title = styled.h3`
  display: flex;
  color: #fff;
  font-size: 1.5em;
  margin: 0;
  align-self: center;

  ${landscapeStyle(
    () => css`
      align-self: flex-start;
    `
  )}
`

const Description = styled.p`
  display: flex;
  color: #fff;
  flex-wrap: wrap;

  ${landscapeStyle(
    () => css`
      max-width: 440px;
    `
  )}
`

const QueryContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  gap: 12px;
  align-items: center;
  max-width: 100%;
`

const Query = styled.div`
  display: flex;
  flex: 0 1 268px;
  min-width: 0;
  height: 108px;
  overflow-y: auto;
  font-family: 'Fira Code', monospace;
  text-align: left;
  background-color: #0D1117;
  color: #fff;
  padding: 16px;
  border-radius: 4px;
  flex-wrap: wrap;
  white-space: pre-wrap;
  word-break: break-word;

  &::-webkit-scrollbar {
    -webkit-appearance: none;
    width: 7px;
    background-color: #0D1117;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 4px;
    background-color: #7186FF;
  }
`

const CopyWrapper = styled.div`
  position: relative;
  display: flex;
  flex-shrink: 0;
`

const CopyButton = styled.button`
  display: flex;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;

  &:hover {
    opacity: 0.7;
    transform: scale(1.1);
  }
`

const CopyFeedback = styled.span`
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  width: max-content;
  max-width: 220px;
  background-color: #555;
  color: white;
  text-align: center;
  border-radius: 6px;
  padding: 8px 8px;
  font-size: 14px;
  z-index: 100;
  opacity: 0.9;
`

const StyledQueryTitle = styled.p`
  opacity: 0.5;
  margin: 8px 0;
  font-size: 16px;

  ${landscapeStyle(
    () => css`
      margin-right: 0px;
    `
  )}
`

const Image = styled.img`
  width: ${responsiveSize(280, 400)};
  min-width: 0;
  max-height: 400px;
  object-fit: contain;
  height: auto;
  align-self: stretch;
`

const StyledButtonLink = styled(ButtonLink)`
  margin-top: ${responsiveSize(20, 32)};
  margin-right: 84px;

  ${landscapeStyle(
    () => css`
      margin-right: 0px;
    `
  )}
`

const registryQuery = (registryId: string) => `{
  lregistry(id: "${registryId}") {
    numberOfRegistered
    items {
      status
      metadata {
        props {
          label
          value
        }
      }
    }
  }
}`

const components = [
  {
    title: 'Contract Address Tags',
    description:
      'Kleros’ Address Tags provide crucial contract insights BEFORE interaction.',
    query: registryQuery('0x66260c69d03837016d88c9877e61e08ef74c59f2'),
    imageUrl: EtherscanImg,
    imageAlt: 'Etherscan contract page showing a name tag submitted by Kleros Curate',
  },
  {
    title: 'Contract <> Domain Mappings',
    description:
      'Secure users from front-end DNS attacks, phishing, etc. with Kleros’ Contract to Domain Name mappings.',
    query: registryQuery('0x957a53a994860be4750810131d9c876b2f52d6e1'),
    imageUrl: MetamaskPopup,
    imageAlt:
      'MetaMask transaction popup whose Kleros Scout tab warns that the site’s domain is not verified for this contract',
  },
  {
    title: 'Kleros Tokens List',
    description:
      'Use Kleros’ Tokens, the oldest & still functioning TCR in web3.',
    query: registryQuery('0xee1502e29795ef6c2d60f8d7120596abe3bad990'),
    imageUrl: KlerosTokensImg,
    imageAlt: 'Token Lists directory page of the Kleros Tokens list',
  },
]

type CopyState = 'copied' | 'failed' | undefined

interface ICarousel {
  titleAs?: 'h2' | 'h3'
}

const Carousel: React.FC<ICarousel> = ({ titleAs = 'h3' }) => {
  const [index, setIndex] = useState(0)
  const [hasNavigated, setHasNavigated] = useState(false)
  const [copyState, setCopyState] = useState<CopyState>()
  const copyTimeout = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const images = [EtherscanImg, MetamaskPopup, KlerosTokensImg]
    const preloadImages = () => {
      images.forEach((imageUrl) => {
        const img = new window.Image()
        img.src = imageUrl
      })
    }

    preloadImages()
  }, [])

  useEffect(() => () => clearTimeout(copyTimeout.current), [])

  // A "Copied!" from the previous example must not appear to be about the next one.
  const showExample = (getIndex: (prevIndex: number) => number) => {
    clearTimeout(copyTimeout.current)
    setCopyState(undefined)
    setHasNavigated(true)
    setIndex(getIndex)
  }

  const handlePrev = () =>
    showExample((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : components.length - 1))

  const handleNext = () =>
    showExample((prevIndex) => (prevIndex < components.length - 1 ? prevIndex + 1 : 0))

  const showCopyState = (state: CopyState) => {
    clearTimeout(copyTimeout.current)
    setCopyState(state)
    copyTimeout.current = setTimeout(() => setCopyState(undefined), state === 'failed' ? 5000 : 2000)
  }

  const handleCopy = async (query: string) => {
    try {
      await navigator.clipboard.writeText(query)
      showCopyState('copied')
    } catch (err) {
      console.error('Failed to copy: ', err)
      showCopyState('failed')
    }
  }

  const { title, description, query, imageUrl, imageAlt } = components[index]

  return (
    <CarouselContainer>
      <MobileArrowsContainer>
        <ArrowButton type="button" aria-label="Previous example" onClick={handlePrev}>
          <BackArrow aria-hidden="true" />
        </ArrowButton>
        <ArrowButton type="button" aria-label="Next example" onClick={handleNext}>
          <ForwardArrow aria-hidden="true" />
        </ArrowButton>
      </MobileArrowsContainer>
      <DesktopArrowButton
        type="button"
        $direction="back"
        aria-label="Previous example"
        onClick={handlePrev}
      >
        <BackArrow aria-hidden="true" />
      </DesktopArrowButton>
      <InnerContent>
        <LeftContent>
          <Title as={titleAs}>{title}</Title>
          <Description>{description}</Description>
          <StyledQueryTitle>Subgraph Query</StyledQueryTitle>
          <QueryContainer>
            <Query tabIndex={0} role="region" aria-label="Subgraph query">
              {query}
            </Query>
            <CopyWrapper>
              <CopyButton type="button" aria-label="Copy query" onClick={() => handleCopy(query)}>
                <CopyToClipboard aria-hidden="true" />
              </CopyButton>
              <span role="status">
                {copyState && (
                  <CopyFeedback>
                    {copyState === 'copied'
                      ? 'Copied!'
                      : 'Copy failed. Select the query to copy it.'}
                  </CopyFeedback>
                )}
              </span>
            </CopyWrapper>
          </QueryContainer>
          <StyledButtonLink
            href="https://thegraph.com/explorer/subgraphs/9hHo5MpjpC1JqfD3BsgFnojGurXRHTrHWcUcZPPCo6m8"
            target="_blank"
            rel="noopener noreferrer"
          >
            Go to the Subgraph
          </StyledButtonLink>
        </LeftContent>
        <Image src={imageUrl} alt={imageAlt} />
      </InnerContent>
      <DesktopArrowButton
        type="button"
        $direction="forward"
        aria-label="Next example"
        onClick={handleNext}
      >
        <ForwardArrow aria-hidden="true" />
      </DesktopArrowButton>
      <span className="visually-hidden" role="status">
        {hasNavigated ? `Example ${index + 1} of ${components.length}: ${title}` : ''}
      </span>
    </CarouselContainer>
  )
}

export default Carousel
