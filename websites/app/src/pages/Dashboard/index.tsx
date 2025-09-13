import React from 'react'
import styled from 'styled-components'
import { Route, Routes, Navigate } from 'react-router-dom'

import Home from './Home'
import Activity from './Activity'
import Rewards from './Rewards'
import Guide from './Guide'
import Juror from './Juror'
import ScrollTop from 'components/ScrollTop'

const Container = styled.div``

const Dashboard: React.FC = () => {
  return (
    <Container>
      <Routes>
        <Route path="home" element={<Home />} />
        <Route path="activity/*" element={<Activity />} />
        <Route path="rewards" element={<Rewards />} />
        <Route path="guide" element={<Guide />} />
        <Route path="juror" element={<Juror />} />
        <Route path="*" element={<Navigate to="home" replace />} />
      </Routes>
      <ScrollTop />
    </Container>
  )
}

export default Dashboard
