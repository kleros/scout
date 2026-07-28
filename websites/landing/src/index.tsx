import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './app'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'

declare global {
  interface Window {
    ethereum?: any
  }
}

const container = document.getElementById('app')
const root = createRoot(container!)
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ToastContainer theme="colored" />
    </BrowserRouter>
  </React.StrictMode>
)
