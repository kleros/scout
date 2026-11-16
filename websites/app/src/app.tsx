import React, { lazy } from 'react';
import { ErrorBoundary } from "react-error-boundary";
import 'react-loading-skeleton/dist/skeleton.css';
import 'react-toastify/dist/ReactToastify.css';
import StyledComponentsProvider from 'context/StyledComponentsProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import Layout from './layout';
import Web3Provider from "context/Web3Provider";
import AtlasProvider from "context/AtlasProvider";
import { FilterProvider } from "context/FilterContext";
import ErrorFallback from "./components/ErrorFallback";
import Registries from './pages/Registries/';
import ItemDetails from './pages/ItemDetails/';
import RefreshAfterTransactions from './components/RefreshAfterTransactions';
import { buildItemPath, registryMap } from 'utils/items';

const Home = lazy(() => import('pages/Home'));
const Profile = lazy(() => import('pages/Profile'));
const Rewards = lazy(() => import('pages/Rewards'));
const Guide = lazy(() => import('pages/Guide'));
const TermsOfService = lazy(() => import('pages/TermsOfService'));
const SubmitPage = lazy(() => import('pages/SubmitPage'));
const TxResult = lazy(() => import('pages/TxResult'));

/** What the app renders for an address it does not know (the catch-all route below). */
const PageNotFound: React.FC = () => <h1>Page not found</h1>;

const isKnownRegistry = (name: string) => Object.prototype.hasOwnProperty.call(registryMap, name);

/**
 * Renders the registry list only for a known registry slug; anything else gets the "Page not found" of
 * unknown paths instead of crashing the whole app. (The submit and item routes already handle an unknown
 * slug without crashing: "Unknown registry" and the item loader, so they are left as they are.)
 */
const KnownRegistry: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { registryName = '' } = useParams<{ registryName: string }>();
  return isKnownRegistry(registryName) ? children : <PageNotFound />;
};

/**
 * Old links (from before the routes were renamed) land on the page that replaced them. An old link that
 * names nothing known is left to the item page, which is what main showed for these two-segment paths.
 */
const RedirectKeepingQuery: React.FC<{ to: string }> = ({ to }) => {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
};

const LegacyRegistryRedirect: React.FC = () => {
  const { registryName = '' } = useParams<{ registryName: string }>();
  const { search } = useLocation();
  return isKnownRegistry(registryName) ? (
    <Navigate to={`/${registryName}${search}`} replace />
  ) : (
    <ItemDetails />
  );
};

const LegacyItemRedirect: React.FC = () => {
  const { itemId = '' } = useParams<{ itemId: string }>();
  return itemId.includes('@') ? <Navigate to={buildItemPath(itemId)} replace /> : <ItemDetails />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 10000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

const App: React.FC = () => {
  return (
    <StyledComponentsProvider>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Web3Provider>
          <QueryClientProvider client={queryClient}>
            <RefreshAfterTransactions />
            <AtlasProvider>
              <FilterProvider>
                <Routes>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Navigate to="home" replace />} />
                    <Route path="home" element={<Home />} />
                    <Route path="profile/*" element={<Profile />} />
                    <Route path="rewards" element={<Rewards />} />
                    <Route path="guide" element={<Guide />} />
                    <Route path="terms-of-service" element={<TermsOfService />} />
                    <Route path="tx/:txHash" element={<TxResult />} />
                    <Route path="activity" element={<RedirectKeepingQuery to="/profile/pending" />} />
                    <Route path="activity/ongoing" element={<RedirectKeepingQuery to="/profile/pending" />} />
                    <Route path="activity/past" element={<RedirectKeepingQuery to="/profile/resolved" />} />
                    <Route path="activity/disputes" element={<RedirectKeepingQuery to="/profile/disputes" />} />
                    <Route path="registry/:registryName" element={<LegacyRegistryRedirect />} />
                    <Route path="item/:itemId" element={<LegacyItemRedirect />} />
                    <Route path=":registryName" element={<KnownRegistry><Registries /></KnownRegistry>} />
                    <Route path=":registryName/submit" element={<SubmitPage />} />
                    <Route path=":registryName/:itemID" element={<ItemDetails />} />
                    <Route path="*" element={<PageNotFound />} />
                  </Route>
                </Routes>
              </FilterProvider>
            </AtlasProvider>
          </QueryClientProvider>
        </Web3Provider>
      </ErrorBoundary>
    </StyledComponentsProvider>
  );
};

export default App;
