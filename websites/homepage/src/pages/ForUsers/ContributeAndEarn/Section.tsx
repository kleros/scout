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
  width: 106px;
  height: 106px;
  color: #848484;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px;

  ${landscapeStyle(
    () =>
      css`
        width: 142px;
      `
  )}
`

const StyledTitle = styled.h2`
  font-size: 32px;
  margin: 12px;

  ${landscapeStyle(
    () =>
      css`
        margin: 26px;
      `
  )}
`

const StyledDescription = styled.p`
  margin: 0;
`

const Image = styled.img`
  width: 106px;

  ${landscapeStyle(
    () =>
      css`
        width: 142px;
      `
  )}
`

interface ISection {
  title: string
  description: string
  image: string
}

const Section: React.FC<ISection> = ({ title, description, image }) => {
  return (
    <Container>
      <ImagePlaceholder>
        <Image src={image} />
      </ImagePlaceholder>
      <StyledTitle>{title}</StyledTitle>
      <StyledDescription>{description}</StyledDescription>
    </Container>
  )
}

export default Section
