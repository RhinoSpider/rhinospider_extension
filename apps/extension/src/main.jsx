import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Import our HTTPS certificate handler
import './https-certificate-handler.js'

const root = document.getElementById('root');

// Add error boundary
if (!root) {
  console.error('Root element not found');
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}