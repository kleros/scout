import React, { useState, useEffect, useMemo } from 'react';
import { useLocalStorage, clearLocalStorage } from 'hooks/useLocalStorage';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { useSearchParams } from 'react-router-dom';
import { useAttachment } from 'hooks/useAttachment';
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
  const openAttachment = useAttachment();

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
    queryKey: ['addressissues', evmChainId, 'Tags_Queries', githubRepository],
    queryFn: async () => {
      const res = await getAddressValidationIssue(
        evmChainId,
        'Tags_Queries',
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


  const { addItem, isLoading: isSubmitting } = useCurateInteractions();

  const submitTagsQueries = async () => {
    if (!countsData?.Tags_Queries.deposits) return;
    
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
    const enc = new TextEncoder()
    const fileData = enc.encode(JSON.stringify(item))
    const ipfsObject = await ipfsPublish('item.json', fileData)
    const ipfsPath = getIPFSPath(ipfsObject)
    
    await addItem(
      registryMap.Tags_Queries as `0x${string}`,
      ipfsPath,
      countsData.Tags_Queries.deposits
    )
    clearLocalStorage('addTagsQueriesForm');
  };

  const handleClose = () => {
    clearLocalStorage('addTagsQueriesForm');
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
              onClick={() => {
                if (registry.metadata.policyURI) {
                  openAttachment(`https://cdn.kleros.link${registry.metadata.policyURI}`);
                }
              }}
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
      <FieldLabel>Github Repository</FieldLabel>
      <StyledTextInput
        placeholder="e.g. https://github.com/kleros/scout-snap.git"
        value={githubRepository}
        onChange={(e) => setGithubRepository(e.target.value)}
      />
      {addressIssuesData?.link && (
        <ErrorMessage>{addressIssuesData.link.message}</ErrorMessage>
      )}
      <FieldLabel>Commit Hash</FieldLabel>
      <StyledTextInput
        placeholder="e.g. c8baafd"
        value={commitHash}
        onChange={(e) => setCommitHash(e.target.value)}
      />
      <FieldLabel>EVM Chain ID</FieldLabel>
      <StyledTextInput
        placeholder="e.g. 1 (for Ethereum Mainnet)"
        value={evmChainId}
        onChange={(e) => setEvmChainId(e.target.value)}
      />
      <FieldLabel>Description</FieldLabel>
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
          {countsData?.['Tags_Queries']?.deposits
            ? formatEther(
              countsData['Tags_Queries'].deposits.arbitrationCost +
              countsData['Tags_Queries'].deposits.submissionBaseDeposit
            ) + ' xDAI'
            : null}{' | '}Expected Reward: $12
        </ExpectedPayouts>
      </PayoutsContainer>
    </AddContainer>
  );
};

export default AddTagsQueries;