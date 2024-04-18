import React, { useState } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'

const Container = styled.div`
  display: flex;
  flex-direction: row;
  padding: 20px;
  flex-wrap: wrap;
  font-family: 'Oxanium', sans-serif;
  gap: 32px;
  justify-content: center;
  width: 84vw;

  ${landscapeStyle(
    () => css`
      width: 84%;
    `
  )}
`

const StepsContainer = styled.div`
  display: flex;
  margin-top: 32px;
  position: relative;
  flex-direction: column;
  width: 400px;
  gap: 24px;
  transition: transform 0.3s ease, opacity 0.3s ease;
`

const Step = styled.div`
  display: flex;
  cursor: pointer;
`

const TitleAndDescription = styled.div`
  display: flex;
  flex-direction: column;
  text-align: start;
  gap: 8px;
`

const VerticalLine = styled.div<{ activeStep: number }>`
  position: absolute;
  top: 30px;
  left: 15px;
  width: 1px;
  background-color: #cd9dff;
  z-index: 0;

  ${({ activeStep }) =>
    `
    height: ${activeStep === 3 ? 'calc(100% - 240px)' : 'calc(100% - 60px)'};
  `};

  ${({ activeStep }) =>
    landscapeStyle(
      () => css`
        height: ${activeStep === 3
          ? 'calc(100% - 180px)'
          : 'calc(100% - 114px)'};
      `
    )}
`

const StepIndicator = styled.div<{ isActive: boolean }>`
  display: flex;
  min-width: ${({ isActive }) => (isActive ? '30px' : '28px')};
  height: ${({ isActive }) => (isActive ? '30px' : '28px')};
  border-radius: 50%;
  color: ${({ isActive }) => (isActive ? '#fff' : '#747474')};
  background-color: ${({ isActive }) => (isActive ? '#5A2393' : '#08020E')};
  border: ${({ isActive }) => (isActive ? 'none' : '1px solid #cd9dff;')};
  justify-content: center;
  align-items: center;
  margin-right: 16px;
  z-index: 1;
`

const StepTitle = styled.div<{ isActive: boolean }>`
  display: flex;
  color: ${({ isActive }) => (isActive ? '#CFA2FF' : '#747474')};
  font-weight: ${({ isActive }) => (isActive ? '600' : '400')};
  font-size: ${({ isActive }) => (isActive ? '16px' : '14px')};
`

const StepDescription = styled.div<{ isActive: boolean }>`
  color: #fff;
  padding-top: 5px;
  display: ${({ isActive }) => (isActive ? 'block' : 'none')};
  position: relative;
  z-index: 1;
`

const ImagePlaceholder = styled.div`
  width: 260px;
  height: 260px;
  background: #1b1b1b;
  color: #848484;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: ${responsiveSize(4, 32)};
  padding: 8px;
`

const steps = [
  {
    id: 1,
    title: 'Go to any of the 3 registries & read the policy.',
    description:
      'Understanding how to submit insights is key to keeping Kleros Scout reliable. The policy contains simple rules to keep in mind while making submissions to the registries.',
  },
  {
    id: 2,
    title: 'Submit/Suggest an insight with a deposit.',
    description:
      'You can now fill in the contract insights & make a submission with a deposit. This will be returned to you if the submission you’ve made is correct!',
  },
  {
    id: 3,
    title:
      'Post the challenge period, your insight is accepted & eligible to earn rewards!',
    description:
      'Once submitted, your insight is reviewed by the community. If it is challenged for any reason, it is taken to the Kleros Court where a crowdsourced jury decides if the insight’s valid. If there’s no challenge, it is added to the registry & you’re eligible for rewards!',
  },
]

const StepComponent = () => {
  const [activeStep, setActiveStep] = useState(1)

  return (
    <Container>
      <StepsContainer>
        <VerticalLine activeStep={activeStep} /> {/* Added this line */}
        {steps.map((step) => (
          <Step key={step.id} onClick={() => setActiveStep(step.id)}>
            <StepIndicator isActive={activeStep === step.id}>
              {step.id}
            </StepIndicator>
            <TitleAndDescription>
              <StepTitle isActive={activeStep === step.id}>
                {step.title}
              </StepTitle>
              <StepDescription isActive={activeStep === step.id}>
                {step.description}
              </StepDescription>
            </TitleAndDescription>
          </Step>
        ))}
      </StepsContainer>
      <ImagePlaceholder>
        Infographic/GIF about Step {activeStep}
      </ImagePlaceholder>
    </Container>
  )
}

export default StepComponent
