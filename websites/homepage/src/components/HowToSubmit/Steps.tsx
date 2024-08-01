import React, { useEffect, useState } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import PolicyImage from 'tsx:svgs/how-to-submit/policy.svg'
import SubmitImage from 'tsx:svgs/how-to-submit/submit.svg'
import RewardsImage from 'tsx:svgs/how-to-submit/rewards.svg'

const Container = styled.div`
  display: flex;
  flex-direction: row;
  padding: 20px;
  flex-wrap: wrap;
  font-family: 'Oxanium', sans-serif;
  gap: ${responsiveSize(0, 40)};
  justify-content: center;
  width: 84vw;

  ${landscapeStyle(
    () => css`
      width: 100%;
    `
  )}
`

const StepsContainer = styled.div`
  display: flex;
  margin-top: 32px;
  position: relative;
  flex-direction: column;
  width: 578px;
  gap: 42px;
  transition: transform 0.3s ease, opacity 0.3s ease;

  ${landscapeStyle(
    () => css`
      height: 460px;
    `
  )}
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
  left: 16px;
  width: 1px;
  background-color: #cd9dff;
  z-index: 0;

  ${({ activeStep }) =>
    `
    height: ${activeStep === 3 ? 'calc(100% - 400px)' : 'calc(100% - 80px)'};
  `};

  ${({ activeStep }) =>
    landscapeStyle(
      () => css`
        height: ${activeStep === 3
          ? 'calc(100% - 300px)'
          : 'calc(100% - 88px)'};
        top: 30px;
        left: 24px;
      `
    )}
`

const StepIndicator = styled.div<{ isActive: boolean }>`
  display: flex;
  min-width: ${({ isActive }) => (isActive ? '32px' : '30px')};
  height: ${({ isActive }) => (isActive ? '32px' : '30px')};
  border-radius: 50%;
  font-size: ${responsiveSize(20, 24)};
  color: ${({ isActive }) => (isActive ? '#fff' : '#747474')};
  background-color: ${({ isActive }) => (isActive ? '#5A2393' : '#08020E')};
  border: ${({ isActive }) => (isActive ? 'none' : '1px solid #cd9dff;')};
  justify-content: center;
  align-items: center;
  margin-right: 16px;
  z-index: 1;

  ${({ isActive }) =>
    landscapeStyle(
      () => css`
        top: 5px;
        min-width: ${isActive ? '48px' : '46px'};
        height: ${isActive ? '48px' : '46px'};
      `
    )}
`

const StepTitle = styled.div<{ isActive: boolean }>`
  display: flex;
  color: ${({ isActive }) => (isActive ? '#CFA2FF' : '#747474')};
  font-weight: ${({ isActive }) => (isActive ? '600' : '400')};
  font-size: ${({ isActive }) =>
    isActive ? responsiveSize(20, 24) : responsiveSize(16, 20)};
  margin-bottom: 4px;

  ${landscapeStyle(
    () => css`
      margin-bottom: 12px;
    `
  )}
`

const ImageContainer = styled.div`
  width: 448px;
  height: 225px;
  color: #848484;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: ${responsiveSize(4, 32)};
  padding: 8px;

  ${landscapeStyle(
    () => css`
      height: 436px;
    `
  )}
`

const Paragraph = styled.div<{ isActive: boolean }>`
  display: ${({ isActive }) => (isActive ? 'block' : 'none')};
  color: #fff;
  font-size: ${responsiveSize(20, 24)};
  margin-bottom: 10px;
  font-weight: 300;
`

const StyledImage = styled.div`
  width: 220px;

  ${landscapeStyle(
    () => css`
      width: 340px;
    `
  )}
`

const steps = [
  {
    id: 1,
    title: 'Go to any of the 3 registries & read the policy.',
    paragraphs: [
      'Understanding how to submit insights is key to keeping Kleros Scout reliable.',
      'The policy contains simple rules to keep in mind while making submissions to the registries.',
    ],
  },
  {
    id: 2,
    title: 'Submit/Suggest an insight with a deposit.',
    paragraphs: [
      'You can now fill in the contract insights & make a submission with a deposit.',
      'This will be returned to you if the submission you’ve made is correct!',
    ],
  },
  {
    id: 3,
    title:
      'Post the challenge period, your insight is accepted & eligible to earn rewards!',
    paragraphs: [
      'Once submitted, your insight is reviewed by the community. If it is challenged for any reason' +
        ' it is taken to the Kleros Court where a crowdsourced jury decides if the insight’s valid.' +
        ' If there’s no challenge, it is added to the registry & you’re eligible for rewards!',
    ],
  },
]

type Timeout = ReturnType<typeof setTimeout>

const StepComponent = () => {
  const [activeStep, setActiveStep] = useState(1)
  const [isManuallyClicked, setIsManuallyClicked] = useState(false)

  useEffect(() => {
    let interval: Timeout

    if (!isManuallyClicked) {
      interval = setInterval(() => {
        setActiveStep((prevStep) => (prevStep === 3 ? 1 : prevStep + 1))
      }, 10000)
    }

    return () => clearInterval(interval)
  }, [isManuallyClicked])

  return (
    <Container>
      <StepsContainer>
        <VerticalLine activeStep={activeStep} />
        {steps.map((step) => (
          <Step
            key={step.id}
            onClick={() => {
              setActiveStep(step.id), setIsManuallyClicked(true)
            }}
          >
            <StepIndicator isActive={activeStep === step.id}>
              {step.id}
            </StepIndicator>
            <TitleAndDescription>
              <StepTitle isActive={activeStep === step.id}>
                {step.title}
              </StepTitle>
              {step.paragraphs.map((paragraph, index) => (
                <Paragraph key={index} isActive={activeStep === step.id}>
                  {paragraph}
                </Paragraph>
              ))}
            </TitleAndDescription>
          </Step>
        ))}
      </StepsContainer>
      <ImageContainer>
        {activeStep === 1 && <StyledImage as={PolicyImage} />}
        {activeStep === 2 && <StyledImage as={SubmitImage} />}
        {activeStep === 3 && <StyledImage as={RewardsImage} />}
      </ImageContainer>
    </Container>
  )
}

export default StepComponent
