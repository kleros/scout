import styled, { css, keyframes } from "styled-components";

export const hoverShortTransitionTiming = css`
  transition: 0.1s;
`;

export const hoverLongTransitionTiming = css`
  transition: 0.2s;
`;

export const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const shimmer = keyframes`
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
`;

export const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

export const EmptyState = styled.div`
  color: ${({ theme }) => theme.secondaryText};
`;
