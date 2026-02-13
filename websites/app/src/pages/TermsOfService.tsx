import React from 'react'
import styled from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import { MAX_WIDTH_LANDSCAPE } from 'styles/landscapeStyle'
import { tosTitle, tosIntro, tosSections } from 'shared/tosContent'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;
  padding: ${responsiveSize(32, 64)} ${responsiveSize(16, 48)};
  color: ${({ theme }) => theme.primaryText};
  font-family: 'Open Sans', sans-serif;
  line-height: 1.7;
`

const Title = styled.h1`
  font-size: ${responsiveSize(24, 36)};
  font-weight: 700;
  margin-bottom: 8px;
`

const SectionTitle = styled.h2`
  font-size: ${responsiveSize(18, 22)};
  font-weight: 600;
  margin-top: 32px;
  margin-bottom: 12px;
`

const Paragraph = styled.p`
  font-size: 15px;
  margin-bottom: 16px;
  color: ${({ theme }) => theme.secondaryText};
`

const List = styled.ul`
  margin: 0 0 16px 24px;
  padding: 0;
  font-size: 15px;
  color: ${({ theme }) => theme.secondaryText};

  li {
    margin-bottom: 8px;
  }
`

const TermsOfService: React.FC = () => (
  <Container>
    <Title>{tosTitle}</Title>
    {tosIntro.map((text, i) => (
      <Paragraph key={i}>{text}</Paragraph>
    ))}
    {tosSections.map((section) => (
      <React.Fragment key={section.title}>
        <SectionTitle>{section.title}</SectionTitle>
        {section.content.map((block, i) =>
          block.type === 'paragraph' ? (
            <Paragraph key={i}>{block.text}</Paragraph>
          ) : (
            <List key={i}>
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </List>
          )
        )}
      </React.Fragment>
    ))}
  </Container>
)

export default TermsOfService
