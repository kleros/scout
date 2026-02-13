import React from 'react'
import styled from 'styled-components'
import { responsiveSize } from 'styles/responsiveSize'
import { MAX_WIDTH_LANDSCAPE } from 'styles/landscapeStyle'
import { tosTitle, tosIntro, tosSections } from 'shared/tosContent'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;
  padding: ${responsiveSize(32, 64)} ${responsiveSize(16, 48)};
  color: #e0e0e0;
  font-family: 'Open Sans', sans-serif;
  line-height: 1.7;
`

const Title = styled.h1`
  font-family: 'Oxanium', sans-serif;
  font-size: ${responsiveSize(24, 36)};
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 8px;
`

const SectionTitle = styled.h2`
  font-family: 'Oxanium', sans-serif;
  font-size: ${responsiveSize(18, 22)};
  font-weight: 600;
  color: #ffffff;
  margin-top: 32px;
  margin-bottom: 12px;
`

const Paragraph = styled.p`
  font-size: 15px;
  margin-bottom: 16px;
`

const List = styled.ul`
  margin: 0 0 16px 24px;
  padding: 0;
  font-size: 15px;

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
