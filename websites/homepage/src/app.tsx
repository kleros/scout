import React, { useRef } from 'react'
import styled from 'styled-components'
import 'overlayscrollbars/styles/overlayscrollbars.css'
import 'react-loading-skeleton/dist/skeleton.css'
import { Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OverlayScrollbarsComponent } from 'overlayscrollbars-react'
import { OverlayScrollContext } from 'context/OverlayScrollContext'
import StyledComponentsProvider from 'context/StyledComponentsProvider'
import Layout from './layout'
import Home from 'pages/Home'
import ForUsers from './pages/ForUsers'
import ForBuilders from './pages/ForBuilders'

const StyledOverlayScrollbarsComponent = styled(OverlayScrollbarsComponent)`
  height: 100vh;
  width: 100vw;
`

const queryClient = new QueryClient()

const App: React.FC = () => {
  const containerRef = useRef(null)

  return (
    <OverlayScrollContext.Provider value={containerRef}>
      <StyledOverlayScrollbarsComponent
        ref={containerRef}
        options={{ showNativeOverlaidScrollbars: true }}
      >
        <StyledComponentsProvider>
          <QueryClientProvider client={queryClient}>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="for-users/*" element={<ForUsers />} />
                <Route path="for-builders/*" element={<ForBuilders />} />
                <Route path="*" element={<h1>404 Not Found</h1>} />
              </Route>
            </Routes>
          </QueryClientProvider>
        </StyledComponentsProvider>
      </StyledOverlayScrollbarsComponent>
    </OverlayScrollContext.Provider>
  )
}

export default App
