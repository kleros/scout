import React, { useState, useEffect, useMemo } from 'react';
import { useLocalStorage, clearLocalStorage } from 'hooks/useLocalStorage';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'ethers';
import { useSearchParams } from 'react-router-dom';
import { useScrollTop } from 'hooks/useScrollTop';
import { ClosedButtonContainer } from 'pages/Home';
import {
  AddContainer,
  AddHeader,
  AddSubtitle,
  AddTitle,
  CloseButton,
  StyledGoogleFormAnchor,
  StyledTextInput,
  SubmitButton,
  ExpectedPayouts,
  PayoutsContainer,
  Divider,
  SubmissionButton
} from './index';
import { fetchItemCounts, FocusedRegistry } from 'utils/itemCounts';

const AddTagsQueries: React.FC = () => {
  const [formData, setFormData] = useLocalStorage('addTagsQueriesForm', {
    GithubRepository: '',
    commitHash: '',
    evmChainId: '',
    description: '',
  });

  const [GithubRepository, setGithubRepository] = useState<string>(formData.GithubRepository);
  const [commitHash, setCommitHash] = useState<string>(formData.commitHash);
  const [evmChainId, setEvmChainId] = useState<string>(formData.evmChainId);
  const [description, setDescription] = useState<string>(formData.description);

  const [searchParams, setSearchParams] = useSearchParams();
  const scrollTop = useScrollTop();

  useEffect(() => {
    setFormData({ GithubRepository, commitHash, evmChainId, description });
  }, [GithubRepository, commitHash, evmChainId, description]);

  const { isLoading: addressIssuesLoading, data: addressIssuesData } = useQuery({
    queryKey: ['addressissues', ':' +  'Tags_Queries'],
    queryFn: () => ({ /* validation logic */ }),
    // enabled: Boolean(GithubRepository) || Boolean(commitHash) || Boolean(evmChainID) || Boolean(description),
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
    console.log('Submitting Tags Queries:', { GithubRepository, commitHash, evmChainId, description });
    clearLocalStorage('addTagsQueriesForm');
  };

  const handleClose = () => {
    clearLocalStorage('addTagsQueriesForm');
  };

  const submittingDisabled = useMemo(() => {
    return Boolean(!GithubRepository || !commitHash || !evmChainId || !description || !!addressIssuesData || addressIssuesLoading);
  }, [GithubRepository, commitHash, evmChainId, description, addressIssuesData, addressIssuesLoading]);

  return (
    <AddContainer>
      <AddHeader>
        <div>
          <AddTitle>Submit Address Tags Query</AddTitle>
          <AddSubtitle>
            Want to suggest an entry without any deposit?{' '}
            <StyledGoogleFormAnchor
              target="_blank"
              href="https://docs.google.com/forms/d/e/1FAIpQLSdTwlrcbbPOkSCMKuUj42d_koSAEkWjMLz5hhTc5lB6aGCO9w/viewform"
            >
              Click here
            </StyledGoogleFormAnchor>
          </AddSubtitle>
        </div>
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
        value={GithubRepository}
        onChange={(e) => setGithubRepository(e.target.value)}
      />
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