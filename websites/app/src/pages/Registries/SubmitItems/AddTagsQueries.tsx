import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocalStorage } from 'hooks/useLocalStorage'
import { useSubmissionChecks } from 'hooks/useSubmissionChecks'
import { useCurateSubmit } from 'hooks/useCurateSubmit'
import FormHeader from './FormHeader'
import SubmitFooter from './SubmitFooter'
import {
  AddContainer,
  StyledTextInput,
  FieldLabel,
} from './index'
import Tooltip from 'components/Tooltip'
import { ChecksPanel, FieldChecks } from 'components/SubmissionChecks'

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

  useEffect(() => {
    setFormData({ githubRepository, commitHash, evmChainId, description })
  }, [githubRepository, commitHash, evmChainId, description, setFormData])

  const values = useMemo(
    () => ({
      'Github Repository URL': githubRepository,
      'Commit hash': commitHash,
      'EVM Chain ID': evmChainId,
      Description: description,
    }),
    [githubRepository, commitHash, evmChainId, description],
  )
  const draft = useMemo(() => ({ registry: 'tags-queries' as const, values }), [values])
  const checks = useSubmissionChecks(draft)
  const applyFix = useCallback((field: string, value: string) => {
    if (field === 'Github Repository URL') setGithubRepository(value)
    else if (field === 'Commit hash') setCommitHash(value)
    else if (field === 'EVM Chain ID') setEvmChainId(value)
  }, [])

  const { submit, isSubmitting, deposits } = useCurateSubmit({
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
    checks.blocking ||
    checks.checking ||
    isSubmitting

  const handleSubmit = () => submit(values)

  return (
    <AddContainer>
      <FormHeader title="Submit Address Tags Query" />
      <FieldLabel>
        <Tooltip data-tooltip={columns[0].description}>Github Repository</Tooltip>
      </FieldLabel>
      <StyledTextInput
        placeholder="e.g. https://github.com/kleros/scout-snap.git"
        value={githubRepository}
        onChange={(e) => setGithubRepository(e.target.value)}
      />
      <FieldChecks results={checks.results} field="Github Repository URL" onApplyFix={applyFix} />
      <FieldLabel>
        <Tooltip data-tooltip={columns[1].description}>Commit Hash</Tooltip>
      </FieldLabel>
      <StyledTextInput
        placeholder="e.g. c8baafd"
        value={commitHash}
        onChange={(e) => setCommitHash(e.target.value)}
      />
      <FieldChecks results={checks.results} field="Commit hash" onApplyFix={applyFix} />
      <FieldLabel>
        <Tooltip data-tooltip={columns[2].description}>EVM Chain ID</Tooltip>
      </FieldLabel>
      <StyledTextInput
        placeholder="e.g. 1 (for Ethereum Mainnet)"
        value={evmChainId}
        onChange={(e) => setEvmChainId(e.target.value)}
      />
      <FieldChecks results={checks.results} field="EVM Chain ID" onApplyFix={applyFix} />
      <FieldLabel>
        <Tooltip data-tooltip={columns[3].description}>Description</Tooltip>
      </FieldLabel>
      <StyledTextInput
        placeholder="e.g. An item for retrieving SushiSwap v3 tags on..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <FieldChecks results={checks.results} field="Description" onApplyFix={applyFix} />
      <ChecksPanel
        results={checks.results}
        checking={checks.checking}
        onRetry={checks.retry}
        onApplyFix={applyFix}
      />
      <SubmitFooter
        deposits={deposits}
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
