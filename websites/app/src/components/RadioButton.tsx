import styled from 'styled-components'

const RadioButton = styled.input.attrs({ type: 'radio' })`
  width: 16px;
  height: 16px;
  cursor: pointer;
  appearance: none;
  border: 1.5px solid ${({ theme }) => theme.stroke};
  border-radius: 50%;
  background: transparent;
  position: relative;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.borderHover};
  }

  &:checked {
    border-color: ${({ theme }) => theme.secondaryBlue};
  }

  &:checked::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ theme }) => theme.secondaryBlue};
  }
`

export default RadioButton
