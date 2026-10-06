import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@mantine/core/styles.css'
import { AuthProvider } from '../../src/components/auth/AuthProvider.jsx'
import App from './App.jsx'
import { AdminThemeProvider } from './theme/AdminThemeProvider.jsx'
import '../../src/index.css'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter><AuthProvider><AdminThemeProvider><App /></AdminThemeProvider></AuthProvider></BrowserRouter>
  </React.StrictMode>,
)
