import React from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
import { baseButtonStyles, primaryButtonStyles } from 'components/Button'
import { useDocumentTitle } from 'hooks/useDocumentTitle'
import { registryNavOptions } from 'utils/items'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 96px 24px;
  text-align: center;

  h1 {
    margin: 0;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.secondaryText};
  }
`

const HomeLink = styled(Link)`
  ${baseButtonStyles}
  ${primaryButtonStyles}
  margin-top: 8px;
  padding: 10px 24px;
  font-size: 16px;
`

const RegistryList = styled.nav`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 24px;
  margin-top: 16px;

  a {
    font-size: 14px;
    color: ${({ theme }) => theme.primaryBlue};
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`

const NotFound: React.FC = () => {
  useDocumentTitle('Page not found')

  return (
    <Container>
      <h1>Page not found</h1>
      <p>This link does not match any page on Scout. It may be old or mistyped.</p>
      <HomeLink to="/home">Go to Home</HomeLink>
      <p>Or open a registry:</p>
      <RegistryList aria-label="Registries">
        {registryNavOptions.map(({ label, value }) => (
          <Link key={value} to={`/${value}`}>
            {label}
          </Link>
        ))}
      </RegistryList>
    </Container>
  )
}

export default NotFound
