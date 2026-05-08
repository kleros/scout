import React from 'react'
import 'react-loading-skeleton/dist/skeleton.css'
import { Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import StyledComponentsProvider from 'context/StyledComponentsProvider'
import Layout from './layout'
import Home from 'pages/Home'
import ForUsers from './pages/ForUsers'
import ForBuilders from './pages/ForBuilders'
import TermsOfService from './pages/TermsOfService'

const queryClient = new QueryClient()

const App: React.FC = () => {
  return (
    <StyledComponentsProvider>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="for-users/*" element={<ForUsers />} />
            <Route path="for-builders/*" element={<ForBuilders />} />
            <Route path="terms-of-service" element={<TermsOfService />} />
            <Route path="*" element={<h1>404 Not Found</h1>} />
          </Route>
        </Routes>
      </QueryClientProvider>
    </StyledComponentsProvider>
  )
}

export default App
