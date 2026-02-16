import React from 'react';
import styled from 'styled-components';
import { getRegistryKey } from 'utils/items';

const HeaderRow = styled.div<{ registryType?: string }>`
  display: grid;
  grid-template-columns: ${({ registryType }) => {
    switch (registryType) {
      case 'tokens':
        return '1.2fr 0.3fr 0.5fr 0.6fr 1fr 1.2fr 1fr'; // Status, Logo, Symbol, Name, Website, Address, Next/Last event
      case 'single-tags':
        return '1.2fr 0.8fr 1fr 1fr 1.2fr 1fr'; // Status, Project, Tag, Website, Address, Next/Last event
      case 'cdn':
        return '1.2fr 0.3fr 1fr 1fr 1.2fr 1fr'; // Status, Proof, Domain, Website, Address, Next/Last event
      case 'tags-queries':
        return '1.2fr 1.3fr 1fr 0.4fr 0.9fr 1fr'; // Status, Description, Repository, Commit, Chain, Next/Last event
      default:
        return '200px 280px 180px 200px 100px 180px';
    }
  }};
  gap: 16px;
  align-items: center;
  padding: 12px 0 8px 0;
  border-radius: 0;
  background: transparent;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.divider};
  font-family: "Open Sans", sans-serif;
  margin-bottom: 0;
  width: 100%;
`;

const HeaderCell = styled.div`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  padding: 0;

  @media (min-width: 1200px) {
    font-size: 12px;
    letter-spacing: 0.6px;
  }
`;

const CenteredHeaderCell = styled(HeaderCell)`
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
`;

interface ListHeaderProps {
  registryAddress?: string;
}

const ListHeader: React.FC<ListHeaderProps> = ({ registryAddress }) => {
  const registryType = registryAddress ? getRegistryKey(registryAddress) : undefined;

  // Tokens registry columns
  if (registryType === 'tokens') {
    return (
      <HeaderRow registryType={registryType}>
        <HeaderCell>Status</HeaderCell>
        <HeaderCell>Logo</HeaderCell>
        <HeaderCell>Symbol</HeaderCell>
        <HeaderCell>Name</HeaderCell>
        <HeaderCell>Website</HeaderCell>
        <HeaderCell>Address</HeaderCell>
        {/* <CenteredHeaderCell>Decimals</CenteredHeaderCell> */}
        {/* <HeaderCell>Submitted by</HeaderCell> */}
        <HeaderCell>Next/Last event</HeaderCell>
      </HeaderRow>
    );
  }

  // Single Tags registry columns
  if (registryType === 'single-tags') {
    return (
      <HeaderRow registryType={registryType}>
        <HeaderCell>Status</HeaderCell>
        <HeaderCell>Project</HeaderCell>
        <HeaderCell>Tag</HeaderCell>
        <HeaderCell>Website</HeaderCell>
        <HeaderCell>Address</HeaderCell>
        {/* <HeaderCell>Submitted by</HeaderCell> */}
        <HeaderCell>Next/Last event</HeaderCell>
      </HeaderRow>
    );
  }

  // CDN registry columns
  if (registryType === 'cdn') {
    return (
      <HeaderRow registryType={registryType}>
        <HeaderCell>Status</HeaderCell>
        <HeaderCell>Proof</HeaderCell>
        <HeaderCell>Domain</HeaderCell>
        <HeaderCell>Website</HeaderCell>
        <HeaderCell>Address</HeaderCell>
        {/* <HeaderCell>Submitted by</HeaderCell> */}
        <HeaderCell>Next/Last event</HeaderCell>
      </HeaderRow>
    );
  }

  // Tags Queries registry columns
  if (registryType === 'tags-queries') {
    return (
      <HeaderRow registryType={registryType}>
        <HeaderCell>Status</HeaderCell>
        <HeaderCell>Description</HeaderCell>
        <HeaderCell>Repository</HeaderCell>
        <HeaderCell>Commit</HeaderCell>
        <HeaderCell>Chain</HeaderCell>
        {/* <HeaderCell>Submitted by</HeaderCell> */}
        <HeaderCell>Next/Last event</HeaderCell>
      </HeaderRow>
    );
  }

  // Default fallback
  return (
    <HeaderRow registryType={registryType}>
      <HeaderCell>Name</HeaderCell>
      <HeaderCell>Website</HeaderCell>
      <HeaderCell>Address</HeaderCell>
      <HeaderCell>Submitted by</HeaderCell>
      <CenteredHeaderCell>Decimals</CenteredHeaderCell>
      <HeaderCell>Status</HeaderCell>
    </HeaderRow>
  );
};

export default ListHeader;
