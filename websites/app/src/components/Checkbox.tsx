import styled from 'styled-components'

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 16px;
  height: 16px;
  cursor: pointer;
  appearance: none;
  flex-shrink: 0;
  /* The unticked box must be visible (3:1 for a control boundary): #989AA0 is about 7:1 on black. */
  border: 1.5px solid ${({ theme }) => theme.tertiaryText};
  border-radius: 3px;
  background: ${({ theme }) => theme.subtleBackground};
  position: relative;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.primaryText};
  }

  &:checked {
    background: ${({ theme }) => theme.secondaryBlue};
    border-color: ${({ theme }) => theme.secondaryBlue};
  }

  &:checked::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 1px;
    width: 4px;
    height: 8px;
    border: solid ${({ theme }) => theme.black};
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`

export default Checkbox
