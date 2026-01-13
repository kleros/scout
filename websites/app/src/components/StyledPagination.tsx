import React from "react";
import styled, { css } from "styled-components";
import { Link, useLocation } from "react-router-dom";
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

const pageButtonStyles = css<{ selected?: boolean }>`
  ${secondaryButtonStyles}
  font-family: "Open Sans", sans-serif;
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
    background: rgba(255, 255, 255, 0.15);
    border-color: ${theme.primaryText};
  `}

  &:hover:not(:disabled):not([aria-current="true"]) {
    background: rgba(255, 255, 255, 0.1);
    border-color: ${({ theme }) => theme.primaryText};
  }
`;

const PageButtonLink = styled(Link)<{ selected?: boolean }>`
  ${pageButtonStyles}
`;

const PageButtonDisabled = styled.span`
  ${pageButtonStyles}
  background: transparent;
  color: ${({ theme }) => theme.buttonDisabledText};
  border-color: ${({ theme }) => theme.buttonDisabled};
  cursor: not-allowed;
  opacity: 0.5;
`;

const StyledPagination: React.FC<Props> = ({ currentPage, numPages, callback }) => {
  const location = useLocation();
  const pages: (number | string)[] = [];

  // Build URL for a given page number
  const buildPageUrl = (page: number) => {
    const params = new URLSearchParams(location.search);
    params.set('page', String(page));
    return `${location.pathname}?${params.toString()}`;
  };

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

  const handleClick = (page: number) => (e: React.MouseEvent) => {
    // Only call callback for left clicks without modifiers (normal navigation)
    if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      callback(page);
    }
  };

  return (
    <PaginationWrapper>
      {currentPage === 1 ? (
        <PageButtonDisabled>❮</PageButtonDisabled>
      ) : (
        <PageButtonLink to={buildPageUrl(currentPage - 1)} onClick={handleClick(currentPage - 1)}>
          ❮
        </PageButtonLink>
      )}
      {pages.map((p, i) =>
        typeof p === "number" ? (
          <PageButtonLink
            key={i}
            to={buildPageUrl(p)}
            selected={p === currentPage}
            aria-current={p === currentPage ? "true" : undefined}
            onClick={handleClick(p)}
          >
            {p}
          </PageButtonLink>
        ) : (
          <PageButtonDisabled key={i}>{p}</PageButtonDisabled>
        )
      )}
      {currentPage === numPages ? (
        <PageButtonDisabled>❯</PageButtonDisabled>
      ) : (
        <PageButtonLink to={buildPageUrl(currentPage + 1)} onClick={handleClick(currentPage + 1)}>
          ❯
        </PageButtonLink>
      )}
    </PaginationWrapper>
  );
};

export { StyledPagination };
export default StyledPagination;
