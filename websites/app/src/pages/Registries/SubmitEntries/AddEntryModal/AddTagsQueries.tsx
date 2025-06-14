import React, { useState, useEffect, useMemo } from 'react';
import { useLocalStorage, clearLocalStorage } from 'hooks/useLocalStorage';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'ethers';
import { useSearchParams } from 'react-router-dom';
import { useScrollTop } from 'hooks/useScrollTop';
import { ClosedButtonContainer } from '~src/pages/Registries';
import {
  AddContainer,
  AddHeader,
  AddTitle,
  CloseButton,
  StyledTextInput,
  SubmitButton,
  ExpectedPayouts,
  PayoutsContainer,
  Divider,
  SubmissionButton,
  ErrorMessage
} from './index';
import { fetchItemCounts, FocusedRegistry } from 'utils/itemCounts';
import { initiateTransactionToCurate } from 'utils/initiateTransactionToCurate';
import { getIPFSPath } from 'utils/getIPFSPath';
import ipfsPublish from 'utils/ipfsPublish';
import { registryMap } from 'utils/fetchItems'; 
import { DepositParams } from 'utils/fetchRegistryDeposits';
import getAddressValidationIssue from 'utils/validateAddress';

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
  const scrollTop = useScrollTop();

  useEffect(() => {
    setFormData({ githubRepository, commitHash, evmChainId, description });
  }, [githubRepository, commitHash, evmChainId, description]);

  const { isLoading: addressIssuesLoading, data: addressIssuesData } = useQuery({
    queryKey: ['addressissues', evmChainId, 'Tags_Queries', githubRepository],
    queryFn: () => getAddressValidationIssue(evmChainId, 'Tags_Queries', undefined, undefined, undefined, undefined, githubRepository, undefined),
    enabled: Boolean(githubRepository) || Boolean(commitHash) || Boolean(evmChainId) || Boolean(description),
  });

  const { data: countsData } = useQuery({
    queryKey: ['counts'],
    queryFn: () => fetchItemCounts(),
    staleTime: Infinity,
  });

  const registry: FocusedRegistry | undefined = useMemo(() => {
    const registryLabel = searchParams.get('registry')
    if (registryLabel === null || !countsData) return undefined
    return countsData[registryLabel]
  }, [searchParams, countsData])


  const submitTagsQueries = async () => {
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
    await initiateTransactionToCurate(
      registryMap.Tags_Queries,
      countsData?.Tags_Queries.deposits as DepositParams,
      ipfsPath
    )
    clearLocalStorage('addTagsQueriesForm');
  };

  const handleClose = () => {
    clearLocalStorage('addTagsQueriesForm');
  };

  const submittingDisabled = useMemo(() => {
    return Boolean(!githubRepository || !commitHash || !evmChainId || !description || !!addressIssuesData || addressIssuesLoading);
  }, [githubRepository, commitHash, evmChainId, description, addressIssuesData, addressIssuesLoading]);

  return (
    <AddContainer>
      <AddHeader>
        <AddTitle>Submit Address Tags Query</AddTitle>
        {registry && (
          <SubmissionButton
            onClick={() => {
              if (registry.metadata.policyURI) {
                setSearchParams({ attachment: `https://cdn.kleros.link${registry.metadata.policyURI}` });
                scrollTop();
              }
            }}
          >
            Submission Guidelines
          </SubmissionButton>
        )}
        <ClosedButtonContainer onClick={handleClose}>
          <CloseButton />
        </ClosedButtonContainer>
      </AddHeader>
      <Divider />
      Github Repository
      <StyledTextInput
        placeholder="e.g. https://github.com/kleros/scout-snap.git"
        value={githubRepository}
        onChange={(e) => setGithubRepository(e.target.value)}
      />
      {addressIssuesData?.link && (
        <ErrorMessage>{addressIssuesData.link.message}</ErrorMessage>
      )}
      Commit Hash
      <StyledTextInput
        placeholder="e.g. c8baafd"
        value={commitHash}
        onChange={(e) => setCommitHash(e.target.value)}
      />
      EVM Chain ID
      <StyledTextInput
        placeholder="e.g. 1 (for Ethereum Mainnet)"
        value={evmChainId}
        onChange={(e) => setEvmChainId(e.target.value)}
      />
      Description
      <StyledTextInput
        placeholder="e.g. An entry for retrieving SushiSwap v3 tags on..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <PayoutsContainer>
        <SubmitButton disabled={submittingDisabled} onClick={submitTagsQueries}>
          Submit
        </SubmitButton>
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