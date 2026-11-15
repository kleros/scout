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

// A tab left open across a release asks for page chunks that no longer exist. Reload once to get
// the new release instead of showing the crash screen; a second failure within a minute is a real
// outage and reaches the error screen. Drafts are kept in localStorage, so they survive the reload.
window.addEventListener('vite:preloadError', (event) => {
  const key = 'scout:reloaded-for-release'
  try {
    const last = Number(sessionStorage.getItem(key)) || 0
    if (Date.now() - last < 60_000) return
    sessionStorage.setItem(key, String(Date.now()))
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

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
