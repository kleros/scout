import styled from 'styled-components';

// Modal structure components
export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
`;

export const ModalWrapper = styled.div`
  position: relative;
  width: 90vw;
  max-width: 900px;
  max-height: 90vh;
  border-radius: 20px;
`;

export const ModalContainer = styled.div`
  background: ${({ theme }) => theme.modalBackground};
  backdrop-filter: blur(50px);
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.stroke};
  width: 100%;
  height: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
  box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.4);
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.stroke};
  padding-bottom: 20px;
`;

export const ModalTitle = styled.h2`
  color: ${({ theme }) => theme.primaryText};
  font-size: 20px;
  font-weight: 600;
  margin: 0;
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.primaryText};
  }
`;

// Filter section components
export const FilterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const GroupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const FilterGroupTitle = styled.h4`
  color: ${({ theme }) => theme.secondaryBlue};
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    width: 14px;
    height: 14px;
    fill: ${({ theme }) => theme.secondaryBlue};
  }
`;

export const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.accent};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s;
  opacity: 0.7;

  &:hover {
    background: ${({ theme }) => theme.lightGrey};
    opacity: 1;
  }
`;

// Checkbox components
export const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

export const CheckboxItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;
  padding: 6px 8px;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.lightGrey};
    color: ${({ theme }) => theme.accent};

    .only-button {
      opacity: 1;
    }
  }
`;

export const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;
`;

export const OnlyButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.accent};
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s;
  opacity: 0;

  &:hover {
    background: ${({ theme }) => theme.lightGrey};
  }
`;

// Network components
export const NetworkGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0;
  margin-top: -4px;
`;

export const NetworkItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;
  padding: 6px 8px;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.lightGrey};
    color: ${({ theme }) => theme.accent};

    .only-button {
      opacity: 1;
    }
  }
`;

export const NetworkLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

export const FooterButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.stroke};
`;
