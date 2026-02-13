import React, { lazy } from 'react';
import { ErrorBoundary } from "react-error-boundary";
import 'overlayscrollbars/styles/overlayscrollbars.css';
import 'react-loading-skeleton/dist/skeleton.css';
import 'react-toastify/dist/ReactToastify.css';
import StyledComponentsProvider from 'context/StyledComponentsProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout';
import Web3Provider from "context/Web3Provider";
import { FilterProvider } from "context/FilterContext";
import ErrorFallback from "./components/ErrorFallback";
import Registries from './pages/Registries/';
import ItemDetails from './pages/ItemDetails/';

const Home = lazy(() => import('pages/Home'));
const Profile = lazy(() => import('pages/Profile'));
const Rewards = lazy(() => import('pages/Rewards'));
const Guide = lazy(() => import('pages/Guide'));
const TermsOfService = lazy(() => import('pages/TermsOfService'));

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
            <FilterProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="home" replace />} />
                <Route path="home" element={<Home />} />
                <Route path="profile/*" element={<Profile />} />
                <Route path="rewards" element={<Rewards />} />
                <Route path="guide" element={<Guide />} />
                <Route path="terms-of-service" element={<TermsOfService />} />
                <Route path=":registryName" element={<Registries />} />
                <Route path=":registryName/:itemID" element={<ItemDetails />} />
                <Route path="*" element={<h1>Page not found</h1>} />
              </Route>
            </Routes>
            </FilterProvider>
          </QueryClientProvider>
        </Web3Provider>
      </ErrorBoundary>
    </StyledComponentsProvider>
  );
};

export default App;
