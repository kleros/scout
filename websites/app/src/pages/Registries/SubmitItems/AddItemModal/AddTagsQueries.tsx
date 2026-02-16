import React, { useState, useEffect, useMemo } from 'react';
import { useLocalStorage, clearLocalStorage } from 'hooks/useLocalStorage';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { useSearchParams } from 'react-router-dom';
import { ClosedButtonContainer } from 'pages/Registries';
import {
  AddContainer,
  AddHeader,
  HeaderActions,
  AddTitle,
  CloseButton,
  StyledTextInput,
  SubmitButton,
  ExpectedPayouts,
  PayoutsContainer,
  Divider,
  SubmissionButton,
  ErrorMessage,
  FieldLabel
} from './index';
import { FocusedRegistry } from 'utils/itemCounts';
import { useItemCountsQuery } from '../../../../hooks/queries';
import { useCurateInteractions } from '../../../../hooks/contracts/useCurateInteractions';
import { getIPFSPath } from 'utils/getIPFSPath';
import ipfsPublish from 'utils/ipfsPublish';
import { registryMap } from 'utils/items';
import getAddressValidationIssue from 'utils/validateAddress';
import { EnsureChain } from '../../../../components/EnsureChain';
import { infoToast, errorToast } from 'utils/wrapWithToast';
import Tooltip from 'components/Tooltip';

const columns = [
  {
    "label": "Github Repository URL",
    "description": "The URL of the repository containing the function that returns the Contract Tags.  The repository name must be in the kebab case (hyphen-case).",
    "type": "link",
    "isIdentifier": true
  },
  {
    "label": "Commit hash",
    "description": "The hash of the specific commit for this repository to be referenced.",
    "type": "text",
    "isIdentifier": true
  },
  {
    "label": "EVM Chain ID",
    "description": "The integer EVM Chain ID of the chain of the contracts being retrieved by the function in this module.",
    "type": "number",
    "isIdentifier": true
  },
  {
    "label": "Description",
    "description": "A field used to describe the range of contracts being curated here, specifying (if applicable) the version, type and purpose of the contracts that are returned. ",
    "type": "long text",
    "isIdentifier": false
  }
]

const AddTagsQueries: React.FC = () => {
  const [formData, setFormData] = useLocalStorage('addTagsQueriesForm', {
    githubRepository: '',
    commitHash: '',
    evmChainId: '',
    description: '',
  });

  const [githubRepository, setGithubRepository] = useState<string>(formData.githubRepository);
  const [commitHash, setCommitHash] = useState<string>(formData.commitHash);
  const [evmChainId, setEvmChainId] = useState<string>(formData.evmChainId);
  const [description, setDescription] = useState<string>(formData.description);

  const [searchParams, setSearchParams] = useSearchParams();


  useEffect(() => {
    setFormData({ githubRepository, commitHash, evmChainId, description });
  }, [githubRepository, commitHash, evmChainId, description, setFormData]);

  const cacheKey = `addressIssues:${evmChainId}:${githubRepository}`

  const cachedIssues = useMemo(() => {
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null
  
    try {
      return JSON.parse(cached)
    } catch {
      localStorage.removeItem(cacheKey)
      return null
    }
  }, [cacheKey])
  
  const { isLoading: addressIssuesLoading, data: addressIssuesData } = useQuery({
    queryKey: ['addressissues', evmChainId, 'tags-queries', githubRepository],
    queryFn: async () => {
      const res = await getAddressValidationIssue(
        evmChainId,
        'tags-queries',
        undefined,
        undefined,
        undefined,
        undefined,
        githubRepository,
        undefined
      )
      localStorage.setItem(cacheKey, JSON.stringify(res))
      return res
    },
    enabled: Boolean(githubRepository) || Boolean(commitHash) || Boolean(evmChainId) || Boolean(description),
    placeholderData: cachedIssues,
  })

  const { data: countsData } = useItemCountsQuery();

  const registry: FocusedRegistry | undefined = useMemo(() => {
    const registryLabel = searchParams.get('additem')
    if (registryLabel === null || !countsData) return undefined
    return countsData[registryLabel]
  }, [searchParams, countsData])


  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const { addItem, isLoading: isContractLoading } = useCurateInteractions();

  // Combined loading state for both IPFS upload and contract interaction
  const isSubmitting = isLocalLoading || isContractLoading;

  const submitTagsQueries = async () => {
    if (!countsData?.['tags-queries'].deposits) return;

    setIsLocalLoading(true);
    try {
      const values = {
        'Github Repository URL': githubRepository,
        'Commit hash': commitHash,
        'EVM Chain ID': evmChainId,
        'Description': description,
      }
      const item = {
        columns,
        values,
      }

      infoToast('Uploading item to IPFS...');
      const enc = new TextEncoder()
      const fileData = enc.encode(JSON.stringify(item))
      const ipfsObject = await ipfsPublish('item.json', fileData)
      const ipfsPath = getIPFSPath(ipfsObject)

      const result = await addItem(
        registryMap['tags-queries'] as `0x${string}`,
        ipfsPath,
        countsData['tags-queries'].deposits
      );

      if (result?.status) {
        // Reset form state before clearing localStorage to prevent the useEffect from saving it again
        setGithubRepository('');
        setCommitHash('');
        setEvmChainId('');
        setDescription('');
        clearLocalStorage('addTagsQueriesForm');
        // Close the modal by removing the additem query parameter
        setSearchParams((prev) => {
          const prevParams = prev.toString()
          const newParams = new URLSearchParams(prevParams)
          newParams.delete('additem')
          return newParams
        })
      }
    } catch (error) {
      console.error('Error submitting tags queries:', error);
      errorToast(error instanceof Error ? error.message : 'Failed to submit tags queries');
    } finally {
      setIsLocalLoading(false);
    }
  };

  const handleClose = () => {
    // Just close - preserve the draft in localStorage for later
  };

  const submittingDisabled = useMemo(() => {
    return Boolean(!githubRepository || !commitHash || !evmChainId || !description || !!addressIssuesData || addressIssuesLoading || isSubmitting);
  }, [githubRepository, commitHash, evmChainId, description, addressIssuesData, addressIssuesLoading, isSubmitting]);

  return (
    <AddContainer>
      <AddHeader>
        <AddTitle>Submit Address Tags Query</AddTitle>
        <HeaderActions>
          {registry && (
            <SubmissionButton
              href={`https://cdn.kleros.link${registry.metadata.policyURI}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Submission Guidelines
            </SubmissionButton>
          )}
          <ClosedButtonContainer onClick={handleClose}>
            <CloseButton />
          </ClosedButtonContainer>
        </HeaderActions>
      </AddHeader>
      <Divider />
      <FieldLabel><Tooltip data-tooltip={columns[0].description}>Github Repository</Tooltip></FieldLabel>
      <StyledTextInput
        placeholder="e.g. https://github.com/kleros/scout-snap.git"
        value={githubRepository}
        onChange={(e) => setGithubRepository(e.target.value)}
      />
      {addressIssuesData?.link && (
        <ErrorMessage>{addressIssuesData.link.message}</ErrorMessage>
      )}
      <FieldLabel><Tooltip data-tooltip={columns[1].description}>Commit Hash</Tooltip></FieldLabel>
      <StyledTextInput
        placeholder="e.g. c8baafd"
        value={commitHash}
        onChange={(e) => setCommitHash(e.target.value)}
      />
      <FieldLabel><Tooltip data-tooltip={columns[2].description}>EVM Chain ID</Tooltip></FieldLabel>
      <StyledTextInput
        placeholder="e.g. 1 (for Ethereum Mainnet)"
        value={evmChainId}
        onChange={(e) => setEvmChainId(e.target.value)}
      />
      <FieldLabel><Tooltip data-tooltip={columns[3].description}>Description</Tooltip></FieldLabel>
      <StyledTextInput
        placeholder="e.g. An item for retrieving SushiSwap v3 tags on..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <PayoutsContainer>
        <EnsureChain>
          <SubmitButton disabled={submittingDisabled} onClick={submitTagsQueries}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </SubmitButton>
        </EnsureChain>
        <ExpectedPayouts>
          Deposit:{' '}
          {countsData?.['tags-queries']?.deposits
            ? formatEther(
              countsData['tags-queries'].deposits.arbitrationCost +
              countsData['tags-queries'].deposits.submissionBaseDeposit
            ) + ' xDAI'
            : null}
        </ExpectedPayouts>
      </PayoutsContainer>
    </AddContainer>
  );
};

export default AddTagsQueries;