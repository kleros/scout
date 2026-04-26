import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './app'
import Modal from 'react-modal'
import { BrowserRouter } from 'react-router-dom'

declare global {
  interface Window {
    ethereum?: any
  }
}

const container = document.getElementById('app')
Modal.setAppElement(container!)
const root = createRoot(container!)
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
