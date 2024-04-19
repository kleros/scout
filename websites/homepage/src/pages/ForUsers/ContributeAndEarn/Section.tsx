import React from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 84vw;
  align-items: center;

  ${landscapeStyle(
    () => css`
      width: 420px;
    `
  )}
`

const ImagePlaceholder = styled.div`
  width: 140px;
  height: 140px;
  background: #1b1b1b;
  color: #848484;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px;
`

const StyledTitle = styled.h2`
  font-size: 32px;
`

const StyledDescription = styled.p`
  margin: 0;
`

interface ISection {
  title: string
  description: string
}

const Section: React.FC<ISection> = ({ title, description }) => {
  return (
    <Container>
      <ImagePlaceholder>Illustration</ImagePlaceholder>
      <StyledTitle>{title}</StyledTitle>
      <StyledDescription>{description}</StyledDescription>
    </Container>
  )
}

export default Section
