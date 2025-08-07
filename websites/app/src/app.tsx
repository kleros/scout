import React, { lazy, Suspense, useRef } from 'react';
import styled from 'styled-components';
import { ErrorBoundary } from "react-error-boundary";
import 'overlayscrollbars/styles/overlayscrollbars.css';
import 'react-loading-skeleton/dist/skeleton.css';
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react';
import { OverlayScrollContext } from 'context/OverlayScrollContext';
import StyledComponentsProvider from 'context/StyledComponentsProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layout';
import Web3Provider from "context/Web3Provider";
import ErrorFallback from "./components/ErrorFallback";
import Registries from './pages/Registries/';
import ItemDetails from './pages/ItemDetails/';

const Dashboard = lazy(() => import('pages/Dashboard'));

const StyledOverlayScrollbarsComponent = styled(OverlayScrollbarsComponent)`
  height: 100vh;
  width: 100vw;
`;

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
  const containerRef = useRef(null);

  return (
    <StyledComponentsProvider>
      <OverlayScrollContext.Provider value={containerRef}>
        <StyledOverlayScrollbarsComponent ref={containerRef} options={{ showNativeOverlaidScrollbars: true }}>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Web3Provider>
              <QueryClientProvider client={queryClient}>
                <Suspense fallback={null}>
                  <Routes>
                    <Route path="/" element={<Layout />}>
                      <Route index element={<Navigate to="dashboard" replace />} />
                      <Route path="dashboard/*" element={<Dashboard />} />
                      <Route path="registry/*" element={<Registries />} />
                      <Route path="item/:itemId" element={<ItemDetails />} />
                      <Route path="*" element={<h1>Page not found</h1>} />
                    </Route>
                  </Routes>
                </Suspense>
              </QueryClientProvider>
            </Web3Provider>
          </ErrorBoundary>
        </StyledOverlayScrollbarsComponent>
      </OverlayScrollContext.Provider>
    </StyledComponentsProvider>
  );
};

export default App;
