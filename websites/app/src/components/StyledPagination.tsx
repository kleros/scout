import React from "react";
import styled from "styled-components";

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
`;

const PageButton = styled.button<{ selected?: boolean }>`
  background: #2b2f46;
  border: 1px solid #3e445f;
  color: #c7cae6;
  min-width: 40px;
  min-height: 40px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  ${({ selected }) =>
    selected &&
    `
    background: #5676d9;
    border-color: #5676d9;
    color: #ffffff;
  `}
  &:hover:not(:disabled):not([aria-current="true"]) {
    background: #303552;
    border-color: #414970;
    color: #ffffff;
  }
  &:disabled {
    background: transparent;
    border-color: #3e445f;
    color: #5f6585;
    cursor: default;
  }
`;

const StyledPagination: React.FC<Props> = ({ currentPage, numPages, callback }) => {
  const pages: (number | string)[] = [];
  if (numPages <= 5) {
    for (let i = 1; i <= numPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(numPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < numPages - 2) pages.push("...");
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
