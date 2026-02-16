import React from 'react';
import styled, { css } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  ModalOverlay,
  ModalWrapper,
  ModalContainer,
  ModalHeader,
  ModalTitle,
  CloseButton,
} from './ModalComponents';
import { landscapeStyle } from 'styles/landscapeStyle';

import TokensIcon from 'assets/svgs/registries/tokens.svg';
import CDNIcon from 'assets/svgs/registries/cdn.svg';
import SingleTagsIcon from 'assets/svgs/registries/single-tags.svg';
import QueryTagsIcon from 'assets/svgs/registries/query-tags.svg';

const ModalDescription = styled.p`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
  margin: 2px 0 0 0;
`;

const OptionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
`;

const OptionDescription = styled.p`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
  margin: 0;
  transition: color 0.4s ease;
  width: 100%;

  ${landscapeStyle(
    () => css`
      font-size: 16px;
      width: auto;
    `
  )}
`;

const OptionCard = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.gradientCard};
  cursor: pointer;
  transition: all 0.4s ease;
  opacity: 0.7;
  min-height: 100px;

  ${landscapeStyle(
    () => css`
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 0 20px;
      min-height: 114px;
    `
  )}

  &:hover {
    opacity: 1;
    background: ${({ theme }) => theme.gradientHover};
    transform: translateX(2px);
  }

  &:hover ${OptionDescription} {
    color: ${({ theme }) => theme.primaryText};
  }
`;

const OptionLeft = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
  width: 100%;

  ${landscapeStyle(
    () => css`
      flex-direction: column;
      gap: 12px;
      flex: 0 0 auto;
      min-width: 200px;
      margin-left: 32px;
      width: auto;
    `
  )}
`;

const OptionTitle = styled.h3`
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  flex: 1;

  ${landscapeStyle(
    () => css`
      font-size: 16px;
      flex: initial;
    `
  )}
`;

const OptionIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-shrink: 0;

  svg {
    height: 48px;
    width: auto;
    display: block;
  }

  ${landscapeStyle(
    () => css`
      margin-bottom: -14px;

      svg {
        height: 64px;
      }
    `
  )}
`;

const OptionRight = styled.div`
  flex: 1;
`;

interface SubmissionOption {
  title: string;
  description: string;
  registryKey: string;
  icon: React.ComponentType;
}

const SUBMISSION_OPTIONS: SubmissionOption[] = [
  {
    title: 'Kleros Tokens',
    description: 'Submit a token to verify its information and legitimacy.',
    registryKey: 'tokens',
    icon: TokensIcon,
  },
  {
    title: 'Contract Domain Name',
    description: 'Link a smart contract to a specific domain to prevent frontend attacks.',
    registryKey: 'cdn',
    icon: CDNIcon,
  },
  {
    title: 'Single Tags',
    description: 'Verify the ownership and purpose of a contract.',
    registryKey: 'single-tags',
    icon: SingleTagsIcon,
  },
  {
    title: 'Tag Queries',
    description: 'Bulk-submit address tags stored in a decentralized domain.',
    registryKey: 'tags-queries',
    icon: QueryTagsIcon,
  },
];

interface SubmissionSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubmissionSelectionModal: React.FC<SubmissionSelectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleOptionClick = (registryKey: string) => {
    navigate(`/${registryKey}?additem=${registryKey}`);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalWrapper>
        <ModalContainer>
          <ModalHeader>
            <div>
              <ModalTitle>Submit to Scout</ModalTitle>
              <ModalDescription>
                Select what you would like to add to the registry.
              </ModalDescription>
            </div>
            <CloseButton onClick={onClose}>×</CloseButton>
          </ModalHeader>

          <OptionsContainer>
            {SUBMISSION_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <OptionCard
                  key={option.registryKey}
                  onClick={() => handleOptionClick(option.registryKey)}
                >
                  <OptionLeft>
                    <OptionTitle>{option.title}</OptionTitle>
                    <OptionIcon>
                      <Icon />
                    </OptionIcon>
                  </OptionLeft>
                  <OptionRight>
                    <OptionDescription>{option.description}</OptionDescription>
                  </OptionRight>
                </OptionCard>
              );
            })}
          </OptionsContainer>
        </ModalContainer>
      </ModalWrapper>
    </ModalOverlay>
  );
};
