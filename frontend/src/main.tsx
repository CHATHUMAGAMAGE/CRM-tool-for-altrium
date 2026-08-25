import {
  StrictMode,
} from 'react'

import {
  createRoot,
} from 'react-dom/client'

import {
  BrowserRouter,
} from 'react-router'

import {
  CssBaseline,
} from '@mui/material'

import './index.css'

import App from './App.tsx'

import {
  AppearanceProvider,
} from './appearance/AppearanceProvider'


createRoot(
  document.getElementById(
    'root',
  )!,
).render(
  <StrictMode>
    <AppearanceProvider>
      <CssBaseline />

      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppearanceProvider>
  </StrictMode>,
)
