import React from 'react'
import styled from 'styled-components'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 300px;
  align-items: center;
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

interface ISection {
  title: string
  description: string
}

const Section: React.FC<ISection> = ({ title, description }) => {
  return (
    <Container>
      <ImagePlaceholder>Illustration</ImagePlaceholder>
      <h2>{title}</h2>
      {description}
    </Container>
  )
}
export default Section
