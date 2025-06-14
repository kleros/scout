import React, { useEffect, useMemo } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { useSearchParams, createSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchItems } from 'utils/fetchItems'
import { chains } from 'utils/chains'
import { fetchItemCounts } from 'utils/itemCounts'
import Navbar from './Navbar'
import RewardsPage from '../RewardsSection'
import RegistryDetails from './RegistryDetails'
import SubmitButton from './SubmitButton'
import Search from './Search'
import LoadingItems from './LoadingItems'
import EntriesList from './EntriesList'
import Pagination from './Pagination'
import DetailsModal from './EntryDetailsModal'
import RegistryDetailsModal from './RegistryDetails/RegistryDetailsModal'
import Filters from './Filters'
import AddEntryModal from './SubmitEntries/AddEntryModal'
import CloseIcon from 'tsx:svgs/icons/close.svg'
import EvidenceAttachmentDisplay from 'components/AttachmentDisplay'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #08020e;
  min-height: 100vh;
  color: white;
  padding-bottom: 48px;
`

const SearchAndRegistryDetailsAndSubmitContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  background: #08020e;
  color: white;
  width: 84vw;
  margin-bottom: 24px;
  gap: 16px;
  flex-wrap: wrap;

  ${landscapeStyle(
    () => css`
      width: 80%;
    `
  )}
`

const RegistryDetailsAndSubmitContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 24px;
  flex-wrap: wrap;
  justify-content: space-between;
  width: 100%;

  ${landscapeStyle(
    () => css`
      width: auto;
    `
  )}
`

export const StyledCloseButton = styled(CloseIcon)`
  display: flex;
  z-index: 100;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
`

export const ClosedButtonContainer = styled.div`
  display: flex;
  width: 24px;
  height: 24px;
`

export const ITEMS_PER_PAGE = 20

const Home: React.FC = () => {
  let [searchParams, setSearchParams] = useSearchParams()

  const searchQueryKeys = useMemo(
    () => [
      searchParams.getAll('registry').toString(),
      searchParams.getAll('status').toString(),
      searchParams.getAll('disputed').toString(),
      searchParams.getAll('network').toString(),
      searchParams.get('text'),
      searchParams.get('page'),
      searchParams.get('orderDirection'),
    ],
    [searchParams]
  )

  const isDetailsModalOpen = useMemo(
    () => !!searchParams.get('itemdetails'),
    [searchParams]
  )

  const isRegistryDetailsModalOpen = useMemo(
    () => !!searchParams.get('registrydetails'),
    [searchParams]
  )

  const isAddItemOpen = useMemo(
    () => !!searchParams.get('additem'),
    [searchParams]
  )

  const showRewardsPage = useMemo(
    () => searchParams.get('page') === 'rewards',
    [searchParams]
  )

  const isAttachmentOpen = useMemo(
    () => !!searchParams.get('attachment'),
    [searchParams]
  )

  const {
    isLoading: searchLoading,
    data: searchData,
  } = useQuery({
    queryKey: ['fetch', ...searchQueryKeys],
    queryFn: () => fetchItems(searchParams),
  })

  const {
    isLoading: countsLoading,
    data: countsData,
  } = useQuery({
    queryKey: ['counts'],
    queryFn: () => fetchItemCounts(),
    staleTime: Infinity,
  })

  const currentItemCount = useMemo(() => {
    const registry = searchParams.getAll('registry')
    const status = searchParams.getAll('status')
    const disputed = searchParams.getAll('disputed')
    const network = searchParams.getAll('network')
    const text = searchParams.get('text')
    const page = searchParams.get('page')
    if (
      countsLoading ||
      registry.length === 0 ||
      status.length === 0 ||
      disputed.length === 0 ||
      page === null ||
      !countsData
    ) {
      // defaults or counts unloaded yet
      return undefined
    } else if (!text && network.length === 0) {
      // can use the subgraph category counts.
      const getCount = (registry: 'Single_Tags' | 'Tags_Queries' | 'Tokens' | 'CDN') => {
        return (
          (status.includes('Absent') && disputed.includes('false')
            ? countsData[registry].numberOfAbsent
            : 0) +
          (status.includes('Registered') && disputed.includes('false')
            ? countsData[registry].numberOfRegistered
            : 0) +
          (status.includes('RegistrationRequested') &&
            disputed.includes('false')
            ? countsData[registry].numberOfRegistrationRequested
            : 0) +
          (status.includes('RegistrationRequested') && disputed.includes('true')
            ? countsData[registry].numberOfChallengedRegistrations
            : 0) +
          (status.includes('ClearingRequested') && disputed.includes('false')
            ? countsData[registry].numberOfClearingRequested
            : 0) +
          (status.includes('ClearingRequested') && disputed.includes('true')
            ? countsData[registry].numberOfChallengedClearing
            : 0)
        )
      }

      const count =
        (registry.includes('Single_Tags') ? getCount('Single_Tags') : 0) +
        (registry.includes('Tags_Queries') ? getCount('Tags_Queries') : 0) +
        (registry.includes('CDN') ? getCount('CDN') : 0) +
        (registry.includes('Tokens') ? getCount('Tokens') : 0)
      return count
    } else {
      // complex query. can only be known if last query has >21 items.
      // o.w nullify.
      if (!searchData || searchData.length > ITEMS_PER_PAGE) return null
      else {
        // for each previous page, thats guaranteed 20 items
        // + remainder of last page
        return searchData.length + (Number(page) - 1) * ITEMS_PER_PAGE
      }
    }
  }, [searchParams, countsData, countsLoading, searchData])

  // If missing search params, insert defaults.
  useEffect(() => {
    if (searchParams.get('page') === 'rewards' || searchParams.get('attachment') || searchParams.get('itemdetails')) {
      return
    }
    
    const registry = searchParams.getAll('registry')
    const status = searchParams.getAll('status')
    const disputed = searchParams.getAll('disputed')
    const text = searchParams.get('text')
    const page = searchParams.get('page')
    const network = searchParams.getAll('network')
    const orderDirection = searchParams.get('orderDirection')
    if (
      registry.length === 0 ||
      status.length === 0 ||
      disputed.length === 0 ||
      network.length === 0 ||
      orderDirection === null ||
      page === null
    ) {
      const newSearchParams = createSearchParams({
        registry: registry.length === 0 ? ['Single_Tags'] : registry,
        network: network.length === 0 ? [...chains.filter(c => !c.deprecated).map(c => c.id), 'unknown'] : network,
        status:
          status.length === 0
            ? ['Registered', 'RegistrationRequested', 'ClearingRequested', 'Absent']
            : status,
        disputed: disputed.length === 0 ? ['true', 'false'] : disputed,
        page: page === null ? '1' : page,
        orderDirection: orderDirection === null ? 'desc' : orderDirection,
      })
      setSearchParams(newSearchParams)
    }
  }, [searchParams, setSearchParams])

  const totalPages =
    currentItemCount !== null && currentItemCount !== undefined
      ? Math.ceil(currentItemCount / ITEMS_PER_PAGE)
      : null // in complex query, cannot provide this information

  const isItemDetailsOpen = searchParams.get('itemdetails');

  return (
    <Container>
      <Navbar />
      {showRewardsPage ? (
        <RewardsPage />
      ) : isAttachmentOpen ? (
        <EvidenceAttachmentDisplay />
      ) : (
        <>
          {!isItemDetailsOpen && (
            <>
              <SearchAndRegistryDetailsAndSubmitContainer>
                <Search />
                <RegistryDetailsAndSubmitContainer>
                  <RegistryDetails />
                  <SubmitButton />
                </RegistryDetailsAndSubmitContainer>
              </SearchAndRegistryDetailsAndSubmitContainer>

              <Filters />

              {searchLoading || !searchData ? (
                <LoadingItems />
              ) : (
                <EntriesList {...{ searchData }} />
              )}
              <Pagination {...{ totalPages }} />
            </>
          )}

          {isDetailsModalOpen && <DetailsModal />}
          {isRegistryDetailsModalOpen && <RegistryDetailsModal />}
          {isAddItemOpen && <AddEntryModal />}
        </>
      )}
    </Container>
  )
}

export default Home
