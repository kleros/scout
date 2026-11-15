import React, { useEffect } from 'react'
import styled from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import { ButtonRouterLink } from 'components/Button'
import { useDocumentTitle } from 'hooks/useDocumentTitle'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: ${responsiveSize(64, 120)} 24px;
  color: #fff;
  text-align: center;
`

const Title = styled.h1`
  margin: 0;
  font-size: ${responsiveSize(32, 40)};
`

const Message = styled.p`
  margin: 0 0 16px;
`

// The host answers every path with the app, so search engines are told here not to index this page.
const useNoIndex = () => {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])
}

const NotFound: React.FC = () => {
  useDocumentTitle('Page not found')
  useNoIndex()

  return (
    <Container>
      <Title>Page not found</Title>
      <Message>This page doesn’t exist or has moved.</Message>
      <ButtonRouterLink to="/">Back to home</ButtonRouterLink>
    </Container>
  )
}

export default NotFound
