import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Initialize the wallet kit before any component mounts
import './lib/wallet'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
