import React from "react";
import styled from "styled-components";
import { secondaryButtonStyles } from './Button';

interface Props {
  currentPage: number;
  numPages: number;
  callback: (page: number) => void;
}

const PaginationWrapper = styled.nav`
  margin-top: 24px;
  margin-left: auto;
  margin-right: auto;
  display: flex;
  gap: 8px;
  justify-content: center;
`;

const PageButton = styled.button<{ selected?: boolean }>`
  ${secondaryButtonStyles}
  font-family: "Open Sans", sans-serif;
  min-width: 40px;
  min-height: 40px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ selected, theme }) =>
    selected &&
    `
    background: rgba(255, 255, 255, 0.15);
    border-color: ${theme.primaryText};
  `}

  &:hover:not(:disabled):not([aria-current="true"]) {
    background: rgba(255, 255, 255, 0.1);
    border-color: ${({ theme }) => theme.primaryText};
  }

  &:disabled {
    background: transparent;
    color: ${({ theme }) => theme.buttonDisabledText};
    border-color: ${({ theme }) => theme.buttonDisabled};
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const StyledPagination: React.FC<Props> = ({ currentPage, numPages, callback }) => {
  const pages: (number | string)[] = [];

  // Industry standard: show max 7 buttons (1, ..., current-1, current, current+1, ..., last)
  // For small page counts, show all pages
  if (numPages <= 7) {
    for (let i = 1; i <= numPages; i++) pages.push(i);
  } else {
    // Always show first page
    pages.push(1);

    // Show ellipsis if current page is far from start
    if (currentPage > 3) {
      pages.push("...");
    }

    // Show pages around current (current - 1, current, current + 1)
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(numPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Show ellipsis if current page is far from end
    if (currentPage < numPages - 2) {
      pages.push("...");
    }

    // Always show last page
    pages.push(numPages);
  }
  return (
    <PaginationWrapper>
      <PageButton disabled={currentPage === 1} onClick={() => callback(currentPage - 1)}>
        ❮
      </PageButton>
      {pages.map((p, i) =>
        typeof p === "number" ? (
          <PageButton
            key={i}
            selected={p === currentPage}
            aria-current={p === currentPage ? "true" : undefined}
            onClick={() => callback(p)}
          >
            {p}
          </PageButton>
        ) : (
          <PageButton key={i} disabled>
            {p}
          </PageButton>
        )
      )}
      <PageButton disabled={currentPage === numPages} onClick={() => callback(currentPage + 1)}>
        ❯
      </PageButton>
    </PaginationWrapper>
  );
};

export { StyledPagination };
export default StyledPagination;
