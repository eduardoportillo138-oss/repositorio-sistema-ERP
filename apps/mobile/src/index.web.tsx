import React from 'react';
import { createRoot } from 'react-dom/client';
import { configureApiBaseURL } from '@erp/api-client';
import App from './App';
import '../../web/src/styles/base.css';
configureApiBaseURL(import.meta.env.VITE_API_BASE_URL || '/api/v1');
createRoot(document.getElementById('root')!).render(<App />);
