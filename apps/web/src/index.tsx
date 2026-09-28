import React from 'react';
import { createRoot } from 'react-dom/client';
import { configureApiBaseURL } from '@erp/api-client';
import App from './App';
import './styles/base.css';
configureApiBaseURL(import.meta.env.VITE_API_BASE_URL || '/api/v1');
const element = document.getElementById('root');
if (element) createRoot(element).render(<App />);
