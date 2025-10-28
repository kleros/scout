import React, { useMemo, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import Skeleton from 'react-loading-skeleton'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { useSearchParams } from 'react-router-dom'
import { FocusedRegistry } from 'utils/itemCounts'
import { useItemCountsQuery } from 'hooks/queries'
import { useFocusOutside } from 'hooks/useFocusOutside'
import { useScrollTop } from 'hooks/useScrollTop'
import { registryMap } from 'utils/items'

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
`

const ModalWrapper = styled.div`
  position: relative;
  width: 90vw;
  max-width: 900px;
  border-radius: 20px;

  ${landscapeStyle(
    () => css`
      width: 70%;
    `
  )}
`

const ModalContainer = styled.div`
  display: flex;
  background: ${({ theme }) => theme.modalBackground};
  backdrop-filter: blur(50px);
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 20px;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding-top: 24px;
  padding-bottom: 24px;
  box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.4);
`

const StyledLabel = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  font-size: 20px;
  font-weight: bold;
  color: ${({ theme }) => theme.primaryText};
  padding: 0 ${responsiveSize(16, 32)};
`

const StyledA = styled.a`
  display: flex;
  justify-content: center;
  width: 100%;
  word-break: break-word;
  color: ${({ theme }) => theme.primaryBlue};
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.secondaryBlue};
    text-decoration: underline;
  }
`

const StyledButton = styled.button`
  color: ${({ theme }) => theme.primaryBlue};
  cursor: pointer;
  background: none;
  border: none;
  font-size: 20px;
  font-weight: bold;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.secondaryBlue};
  }
`

const StyledImg = styled.img`
  height: 200px;
`

interface RegistryDetailsModalProps {
  registryName?: string;
}

const RegistryDetailsModal: React.FC<RegistryDetailsModalProps> = ({ registryName }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [imgLoaded, setImgLoaded] = useState(false)
  const scrollTop = useScrollTop();

  const { data: countsData, isLoading } = useItemCountsQuery();

  const registry: FocusedRegistry | undefined = useMemo(() => {
    if (!registryName || !countsData) return undefined
    return countsData[registryName]
  }, [registryName, countsData])

  const closeModal = () => {
    setSearchParams((prev) => {
      const prevParams = prev.toString()
      const newParams = new URLSearchParams(prevParams)
      newParams.delete('registrydetails')
      return newParams
    })
  }
  const containerRef = useRef(null)
  useFocusOutside(containerRef, () => closeModal())

  return (
    <ModalOverlay>
      <ModalWrapper>
        <ModalContainer ref={containerRef}>
        {isLoading ? (
          <>
            <Skeleton height={25} width={500} />
            <Skeleton height={25} width={500} />
            <Skeleton height={25} width={500} />
            <Skeleton height={200} width={200} />
          </>
        ) : registry ? (
          <>
            <StyledLabel>Title: {registry.metadata.tcrTitle}</StyledLabel>
            <StyledLabel>
              Address:{' '}
              <StyledA
                href={`https://gnosisscan.io/address/${registry.metadata.address}`}
                target="_blank"
              >
                {registry.metadata.address}
              </StyledA>
            </StyledLabel>
            <StyledLabel>
              Policy:{' '}
              <StyledButton
                onClick={() => {
                  if (registry.metadata.policyURI) {
                    setSearchParams((prev) => {
                      const newParams = new URLSearchParams(prev);
                      newParams.set('attachment', `https://cdn.kleros.link${registry.metadata.policyURI}`);
                      return newParams;
                    });
                    scrollTop();
                  }
                }}
              >
                View
              </StyledButton>
            </StyledLabel>
            {!imgLoaded && <Skeleton height={200} width={200} />}
            <StyledImg
              src={`https://cdn.kleros.link${registry.metadata.logoURI}`}
              onLoad={() => setImgLoaded(true)}
              style={{ filter: registry.metadata?.address === registryMap.CDN ? 'invert(1)' : '', display: imgLoaded ? 'block' : 'none' }}
            />
          </>
        ) : (
          <StyledLabel>No registry data available</StyledLabel>
        )}
        </ModalContainer>
      </ModalWrapper>
    </ModalOverlay>
  )
}

export default RegistryDetailsModal
