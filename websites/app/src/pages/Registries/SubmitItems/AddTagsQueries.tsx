import React, { useEffect, useId, useState } from 'react'
import { useLocalStorage } from 'hooks/useLocalStorage'
import { useValidationIssues } from 'hooks/useValidationIssues'
import { useCurateSubmit } from 'hooks/useCurateSubmit'
import FormHeader from './FormHeader'
import SubmitFooter from './SubmitFooter'
import {
  AddContainer,
  ErrorMessage,
  StyledTextArea,
  StyledTextInput,
  FieldLabel,
  describeIssue,
  singleLineTextAreaProps,
} from './index'

const columns = [
  {
    label: 'Github Repository URL',
    description:
      'The URL of the repository containing the function that returns the Contract Tags.  The repository name must be in the kebab case (hyphen-case).',
    type: 'link',
    isIdentifier: true,
  },
  {
    label: 'Commit hash',
    description: 'The hash of the specific commit for this repository to be referenced.',
    type: 'text',
    isIdentifier: true,
  },
  {
    label: 'EVM Chain ID',
    description:
      'The integer EVM Chain ID of the chain of the contracts being retrieved by the function in this module.',
    type: 'number',
    isIdentifier: true,
  },
  {
    label: 'Description',
    description:
      'A field used to describe the range of contracts being curated here, specifying (if applicable) the version, type and purpose of the contracts that are returned. ',
    type: 'long text',
    isIdentifier: false,
  },
]

const DEFAULT_FORM = {
  githubRepository: '',
  commitHash: '',
  evmChainId: '',
  description: '',
}

const AddTagsQueries: React.FC = () => {
  const [formData, setFormData] = useLocalStorage('addTagsQueriesForm', DEFAULT_FORM)

  const [githubRepository, setGithubRepository] = useState<string>(formData.githubRepository)
  const [commitHash, setCommitHash] = useState<string>(formData.commitHash)
  const [evmChainId, setEvmChainId] = useState<string>(formData.evmChainId)
  const [description, setDescription] = useState<string>(formData.description)
  const id = useId()

  useEffect(() => {
    setFormData({ githubRepository, commitHash, evmChainId, description })
  }, [githubRepository, commitHash, evmChainId, description, setFormData])

  const { data: issues, isLoading: issuesLoading } = useValidationIssues({
    chainId: evmChainId,
    registry: 'tags-queries',
    link: githubRepository,
    commitHash,
  })

  const {
    submit,
    isSubmitting,
    deposits,
    depositsStatus,
    retryDeposits,
    retryingDeposits,
  } = useCurateSubmit({
    registryKey: 'tags-queries',
    localStorageKey: 'addTagsQueriesForm',
    columns,
    onResetForm: () => {
      setGithubRepository('')
      setCommitHash('')
      setEvmChainId('')
      setDescription('')
    },
  })

  const submittingDisabled =
    !githubRepository ||
    !commitHash ||
    !evmChainId ||
    !description ||
    !!issues ||
    issuesLoading ||
    isSubmitting

  const handleSubmit = () =>
    submit({
      'Github Repository URL': githubRepository,
      'Commit hash': commitHash,
      'EVM Chain ID': evmChainId,
      Description: description,
    })

  return (
    <AddContainer>
      <FormHeader title="Submit Address Tags Query" />
      <FieldLabel htmlFor={`${id}-repository`} help={columns[0].description}>
        GitHub Repository
      </FieldLabel>
      <StyledTextInput
        id={`${id}-repository`}
        placeholder="e.g. https://github.com/kleros/scout-snap.git"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={githubRepository}
        onChange={(e) => setGithubRepository(e.target.value)}
        {...describeIssue(`${id}-repository-error`, !!issues?.link)}
      />
      {issues?.link && (
        <ErrorMessage id={`${id}-repository-error`}>
          {issues.link.message}
        </ErrorMessage>
      )}
      <FieldLabel htmlFor={`${id}-commit`} help={columns[1].description}>
        Commit Hash
      </FieldLabel>
      <StyledTextInput
        id={`${id}-commit`}
        placeholder="e.g. c8baafd"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={commitHash}
        onChange={(e) => setCommitHash(e.target.value)}
        {...describeIssue(`${id}-commit-error`, !!issues?.commitHash)}
      />
      {issues?.commitHash && (
        <ErrorMessage id={`${id}-commit-error`}>
          {issues.commitHash.message}
        </ErrorMessage>
      )}
      <FieldLabel htmlFor={`${id}-chain`} help={columns[2].description}>
        EVM Chain ID
      </FieldLabel>
      <StyledTextInput
        id={`${id}-chain`}
        placeholder="e.g. 1 (for Ethereum Mainnet)"
        inputMode="numeric"
        value={evmChainId}
        onChange={(e) => setEvmChainId(e.target.value)}
        {...describeIssue(
          issues?.chainId ? `${id}-chain-error` : `${id}-duplicate-error`,
          !!(issues?.chainId || issues?.duplicate),
        )}
      />
      {issues?.chainId && (
        <ErrorMessage id={`${id}-chain-error`}>
          {issues.chainId.message}
        </ErrorMessage>
      )}
      {issues?.duplicate && (
        <ErrorMessage id={`${id}-duplicate-error`}>
          {issues.duplicate.message}
        </ErrorMessage>
      )}
      <FieldLabel htmlFor={`${id}-description`} help={columns[3].description}>
        Description
      </FieldLabel>
      <StyledTextArea
        id={`${id}-description`}
        rows={3}
        placeholder="e.g. An item for retrieving SushiSwap v3 tags on..."
        value={description}
        {...singleLineTextAreaProps(setDescription)}
      />
      <SubmitFooter
        deposits={deposits}
        depositsStatus={depositsStatus}
        onRetryDeposits={retryDeposits}
        retryingDeposits={retryingDeposits}
        disabled={submittingDisabled}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        registryName="tags-queries"
        submitLabel="Submit Query"
      />
    </AddContainer>
  )
}

export default AddTagsQueries
