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
import NotFound from './pages/NotFound';
import { buildItemPath, registryMap } from 'utils/items';

const Home = lazy(() => import('pages/Home'));
const Profile = lazy(() => import('pages/Profile'));
const Rewards = lazy(() => import('pages/Rewards'));
const Guide = lazy(() => import('pages/Guide'));
const TermsOfService = lazy(() => import('pages/TermsOfService'));
const SubmitPage = lazy(() => import('pages/SubmitPage'));
const TxResult = lazy(() => import('pages/TxResult'));

const ADDRESS_SEGMENT = /^0x[0-9a-fA-F]{40}$/;

/**
 * Renders the page only for a known registry slug (and, where `allowAddress` is set, a raw
 * registry address, which item links fall back to). Anything else is a "Page not found",
 * instead of a crash or an endless spinner.
 */
const KnownRegistry: React.FC<{ children: React.ReactElement; allowAddress?: boolean }> = ({
  children,
  allowAddress = false,
}) => {
  const { registryName = '' } = useParams<{ registryName: string }>();
  const known =
    Object.prototype.hasOwnProperty.call(registryMap, registryName) ||
    (allowAddress && ADDRESS_SEGMENT.test(registryName));
  return known ? children : <NotFound />;
};

/** Old links (from before the routes were renamed) land on the page that replaced them. */
const RedirectKeepingQuery: React.FC<{ to: string }> = ({ to }) => {
  const { search } = useLocation();
  return <Navigate to={`${to}${search}`} replace />;
};

const LegacyRegistryRedirect: React.FC = () => {
  const { registryName = '' } = useParams<{ registryName: string }>();
  const { search } = useLocation();
  return Object.prototype.hasOwnProperty.call(registryMap, registryName) ? (
    <Navigate to={`/${registryName}${search}`} replace />
  ) : (
    <NotFound />
  );
};

const LegacyItemRedirect: React.FC = () => {
  const { itemId = '' } = useParams<{ itemId: string }>();
  return itemId.includes('@') ? <Navigate to={buildItemPath(itemId)} replace /> : <NotFound />;
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
                    <Route path=":registryName/submit" element={<KnownRegistry><SubmitPage /></KnownRegistry>} />
                    <Route path=":registryName/:itemID" element={<KnownRegistry allowAddress><ItemDetails /></KnownRegistry>} />
                    <Route path="*" element={<NotFound />} />
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
