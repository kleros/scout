import React, { useEffect, useId, useState } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { useReducedMotion } from 'hooks/useReducedMotion'
import PolicyImage from 'svgs/how-to-submit/policy.svg'
import SubmitImage from 'svgs/how-to-submit/submit.svg'
import RewardsImage from 'svgs/how-to-submit/rewards.svg'

const Container = styled.div`
  display: flex;
  flex-direction: row;
  padding: 20px;
  flex-wrap: wrap;
  font-family: 'Manrope', sans-serif;
  gap: ${responsiveSize(0, 40)};
  justify-content: center;
  width: 84vw;

  ${landscapeStyle(
    () => css`
      width: 100%;
    `
  )}
`

// The visible list and, on narrow screens, hidden copies of it in each state share one grid cell,
// so the section is always as tall as its tallest state and the content below never jumps.
const StepsContainer = styled.div`
  display: grid;
  margin-top: 32px;
  width: 578px;
`

const VisibleLayer = styled.div`
  grid-area: 1 / 1;
  align-self: start;
  position: relative;

  ${landscapeStyle(
    () => css`
      height: 460px;
    `
  )}
`

const SizingLayer = styled.div`
  grid-area: 1 / 1;
  visibility: hidden;

  ${landscapeStyle(
    () => css`
      display: none;
    `
  )}
`

const StepsList = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 42px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Step = styled.li`
  display: flex;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;

  &:hover {
    transform: translateX(4px);
    opacity: 0.9;
  }
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
  background-color: #7186FF;
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

const INACTIVE_COLOR = '#808080'

const StepIndicator = styled.span<{ isActive: boolean }>`
  display: flex;
  min-width: ${({ isActive }) => (isActive ? '32px' : '30px')};
  height: ${({ isActive }) => (isActive ? '32px' : '30px')};
  border-radius: 50%;
  font-size: ${responsiveSize(20, 24)};
  color: ${({ isActive }) => (isActive ? '#fff' : INACTIVE_COLOR)};
  background-color: ${({ isActive }) => (isActive ? '#7186FF' : '#08020E')};
  border: ${({ isActive }) => (isActive ? 'none' : '1px solid #7186FF;')};
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

const StepTitle = styled.button<{ isActive: boolean }>`
  display: flex;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  text-align: start;
  cursor: pointer;
  color: ${({ isActive }) => (isActive ? '#7186FF' : INACTIVE_COLOR)};
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

const Description = styled.div<{ isActive: boolean }>`
  display: ${({ isActive }) => (isActive ? 'flex' : 'none')};
  flex-direction: column;
  gap: 8px;
`

const Paragraph = styled.div`
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
      'After the challenge period, your insight is accepted & eligible to earn rewards!',
    paragraphs: [
      'Once submitted, your insight is reviewed by the community. If it is challenged for any reason' +
        ' it is taken to the Kleros Court where a crowdsourced jury decides if the insight’s valid.' +
        ' If there’s no challenge, it is added to the registry & you’re eligible for rewards!',
    ],
  },
]

const AUTO_ADVANCE_MS = 10000

interface IStepsList {
  activeStep: number
  idPrefix?: string
  onSelect?: (step: number) => void
}

// With idPrefix and onSelect it is the list people use; without them, a hidden copy used for sizing.
const StepsListContent: React.FC<IStepsList> = ({ activeStep, idPrefix, onSelect }) => (
  <StepsList>
    {steps.map((step) => {
      const isActive = activeStep === step.id
      const descriptionId = idPrefix ? `${idPrefix}-step-${step.id}` : undefined
      return (
        // A click anywhere on the step selects it; the title button is the keyboard and screen-reader control.
        <Step key={step.id} onClick={onSelect ? () => onSelect(step.id) : undefined}>
          <StepIndicator isActive={isActive} aria-hidden="true">
            {step.id}
          </StepIndicator>
          <TitleAndDescription>
            <StepTitle
              type="button"
              isActive={isActive}
              aria-expanded={onSelect ? isActive : undefined}
              aria-controls={descriptionId}
              tabIndex={onSelect ? undefined : -1}
            >
              {step.title}
            </StepTitle>
            <Description id={descriptionId} isActive={isActive}>
              {step.paragraphs.map((paragraph, index) => (
                <Paragraph key={index}>{paragraph}</Paragraph>
              ))}
            </Description>
          </TitleAndDescription>
        </Step>
      )
    })}
  </StepsList>
)

const StepComponent = () => {
  const idPrefix = useId()
  const prefersReducedMotion = useReducedMotion()
  const [activeStep, setActiveStep] = useState(1)
  const [isManuallySelected, setIsManuallySelected] = useState(false)
  const [isPointerInside, setIsPointerInside] = useState(false)
  const [isFocusInside, setIsFocusInside] = useState(false)

  // Steps advance on their own until someone picks one, never while the pointer or keyboard focus is in
  // the section, and never for people who ask for reduced motion.
  const autoAdvance =
    !isManuallySelected && !isPointerInside && !isFocusInside && !prefersReducedMotion

  useEffect(() => {
    if (!autoAdvance) return
    const interval = setInterval(() => {
      setActiveStep((prevStep) => (prevStep === steps.length ? 1 : prevStep + 1))
    }, AUTO_ADVANCE_MS)
    return () => clearInterval(interval)
  }, [autoAdvance])

  const selectStep = (step: number) => {
    setActiveStep(step)
    setIsManuallySelected(true)
  }

  return (
    <Container
      onMouseEnter={() => setIsPointerInside(true)}
      onMouseLeave={() => setIsPointerInside(false)}
      onFocus={() => setIsFocusInside(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFocusInside(false)
      }}
    >
      <StepsContainer>
        <VisibleLayer>
          <VerticalLine activeStep={activeStep} />
          <StepsListContent activeStep={activeStep} idPrefix={idPrefix} onSelect={selectStep} />
        </VisibleLayer>
        {steps.map((step) => (
          <SizingLayer key={step.id} aria-hidden="true">
            <StepsListContent activeStep={step.id} />
          </SizingLayer>
        ))}
      </StepsContainer>
      <ImageContainer>
        {activeStep === 1 && <StyledImage as={PolicyImage} aria-hidden="true" />}
        {activeStep === 2 && <StyledImage as={SubmitImage} aria-hidden="true" />}
        {activeStep === 3 && <StyledImage as={RewardsImage} aria-hidden="true" />}
      </ImageContainer>
    </Container>
  )
}

export default StepComponent
