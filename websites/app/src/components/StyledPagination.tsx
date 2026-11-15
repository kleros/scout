import React, { useState } from "react";
import styled, { css } from "styled-components";
import { secondaryButtonStyles } from './Button';

interface Props {
  currentPage: number;
  numPages: number;
  callback: (page: number) => void;
  /**
   * The total is not known exactly and more pages may follow `numPages` (for example when a
   * count stops at its limit): the last page reads "50+".
   */
  moreBeyondLast?: boolean;
}

const PaginationWrapper = styled.nav`
  margin-top: 24px;
  margin-left: auto;
  margin-right: auto;
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
`;

const pageButtonStyles = css<{ selected?: boolean }>`
  ${secondaryButtonStyles}
  font-family: "Manrope", sans-serif;
  min-width: 40px;
  min-height: 40px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  ${({ selected, theme }) =>
    selected &&
    `
    background: ${theme.activeBackground};
    border-color: ${theme.primaryText};
  `}

  &:hover:not(:disabled):not([aria-current="page"]) {
    background: ${({ theme }) => theme.hoverBackground};
    border-color: ${({ theme }) => theme.primaryText};
  }
`;

const disabledStyles = css`
  background: transparent;
  color: ${({ theme }) => theme.buttonDisabledText};
  border-color: ${({ theme }) => theme.buttonDisabled};
  cursor: not-allowed;
  opacity: 0.5;
`;

const PageButton = styled.button.attrs({ type: 'button' })<{ selected?: boolean }>`
  ${pageButtonStyles}

  &:disabled {
    ${disabledStyles}
  }
`;

const PageButtonDisabled = styled.span`
  ${pageButtonStyles}
  ${disabledStyles}
`;

const PageJumpInput = styled.input`
  ${pageButtonStyles}
  min-width: 80px;
  max-width: 100px;
  text-align: center;
  padding: 0 8px;
  cursor: text;

  ::placeholder {
    color: ${({ theme }) => theme.secondaryText};
    font-size: 12px;
  }
`;

const StyledPagination: React.FC<Props> = ({ currentPage, numPages, callback, moreBeyondLast = false }) => {
  const pages: (number | string)[] = [];
  const [pageJumpValue, setPageJumpValue] = useState<string>("");

  // Handle page jump input change (numeric only)
  const handlePageJumpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      setPageJumpValue(value);
    }
  };

  // Handle page jump navigation. A number past either end goes to that end, so "9999" opens the
  // last page instead of being silently ignored.
  const handleJumpToPage = () => {
    const pageNum = parseInt(pageJumpValue, 10);
    if (isNaN(pageNum)) return;
    const target = Math.min(Math.max(pageNum, 1), Math.max(numPages, 1));
    setPageJumpValue("");
    if (target !== currentPage) callback(target);
  };

  // Handle Enter key press
  const handlePageJumpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
    }
  };

  // Industry standard: show max 7 buttons (1, ..., current-1, current, current+1, ..., last)
  // For small page counts, show all pages
  if (numPages <= 7) {
    for (let i = 1; i <= numPages; i++) pages.push(i);
  } else {
    // Always show first page
    pages.push(1);

    // Show ellipsis if current page is far from start
    if (currentPage > 4) {
      pages.push("...");
    }

    // Show pages around current (current - 2, current - 1, current, current + 1, current + 2)
    const start = Math.max(2, currentPage - 2);
    const end = Math.min(numPages - 1, currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Show ellipsis if current page is far from end
    if (currentPage < numPages - 3) {
      pages.push("...");
    }

    // Always show last page
    pages.push(numPages);
  }

  const isLastListed = (p: number) => moreBeyondLast && p === numPages;
  const atLastPage = currentPage >= numPages && !moreBeyondLast;

  return (
    <PaginationWrapper aria-label="Pagination">
      <PageButton
        aria-label="Previous page"
        disabled={currentPage <= 1}
        onClick={() => callback(currentPage - 1)}
      >
        <span aria-hidden="true">❮</span>
      </PageButton>
      {pages.map((p, i) =>
        typeof p === "number" ? (
          <PageButton
            key={i}
            selected={p === currentPage}
            aria-current={p === currentPage ? "page" : undefined}
            aria-label={isLastListed(p) ? `Page ${p}, more pages may follow` : `Page ${p}`}
            onClick={() => callback(p)}
          >
            {isLastListed(p) ? `${p}+` : p}
          </PageButton>
        ) : (
          <PageButtonDisabled key={i} aria-hidden="true">{p}</PageButtonDisabled>
        )
      )}
      <PageButton
        aria-label="Next page"
        disabled={atLastPage}
        onClick={() => callback(currentPage + 1)}
      >
        <span aria-hidden="true">❯</span>
      </PageButton>
      <PageJumpInput
        type="text"
        inputMode="numeric"
        placeholder="Go to..."
        value={pageJumpValue}
        onChange={handlePageJumpChange}
        onKeyDown={handlePageJumpKeyDown}
        onBlur={handleJumpToPage}
        aria-label={`Go to page (1 to ${numPages}${moreBeyondLast ? ' or more' : ''})`}
      />
    </PaginationWrapper>
  );
};

export { StyledPagination };
export default StyledPagination;
