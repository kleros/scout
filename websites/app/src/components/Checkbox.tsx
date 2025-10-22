import styled from 'styled-components'

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 16px;
  height: 16px;
  cursor: pointer;
  appearance: none;
  border: 1.5px solid ${({ theme }) => theme.stroke};
  border-radius: 3px;
  background: transparent;
  position: relative;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.3);
  }

  &:checked {
    background: ${({ theme }) => theme.primaryText};
    border-color: ${({ theme }) => theme.primaryText};
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
`

export default Checkbox
