import React, { useId, useRef } from 'react';
import styled, { css } from 'styled-components';
import { Link } from 'react-router-dom';
import {
  ModalOverlay,
  ModalWrapper,
  ModalContainer,
  ModalHeader,
  ModalTitle,
  CloseButton,
} from './ModalComponents';
import { landscapeStyle } from 'styles/landscapeStyle';
import { useLockOverlayScroll } from 'hooks/useLockOverlayScroll';
import { useDialog } from 'hooks/useDialog';

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

/** Each option is a link to that registry's submit page, so it works with the keyboard too. */
const OptionCard = styled(Link)`
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
  text-decoration: none;

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

  &:hover,
  &:focus-visible {
    opacity: 1;
    background: ${({ theme }) => theme.gradientHover};
    transform: translateX(2px);
  }

  &:hover ${OptionDescription}, &:focus-visible ${OptionDescription} {
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
    description: 'Submit a GitHub repository whose code returns address tags in bulk for one chain.',
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
  useLockOverlayScroll(isOpen);
  const titleId = useId();
  const firstOption = useRef<HTMLAnchorElement>(null);
  // Focus moves to the first option, Tab stays inside, Escape closes, focus goes back to the opener.
  const { dialogProps } = useDialog(isOpen, onClose, { initialFocus: firstOption });

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalWrapper>
        <ModalContainer {...dialogProps} aria-labelledby={titleId}>
          <ModalHeader>
            <div>
              <ModalTitle id={titleId}>Submit to Scout</ModalTitle>
              <ModalDescription>
                Select what you would like to add to the registry.
              </ModalDescription>
            </div>
            <CloseButton onClick={onClose}>×</CloseButton>
          </ModalHeader>

          <OptionsContainer>
            {SUBMISSION_OPTIONS.map((option, index) => {
              const Icon = option.icon;
              return (
                <OptionCard
                  key={option.registryKey}
                  to={`/${option.registryKey}/submit`}
                  ref={index === 0 ? firstOption : undefined}
                  onClick={onClose}
                >
                  <OptionLeft>
                    <OptionTitle>{option.title}</OptionTitle>
                    <OptionIcon aria-hidden="true">
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
