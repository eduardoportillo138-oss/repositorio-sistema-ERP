import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initializeWebApi } from './config/api';
import './styles/base.css';

const element = document.getElementById('root');
if (element) {
  const root = createRoot(element);
  try {
    initializeWebApi(import.meta.env.VITE_API_BASE_URL, import.meta.env.PROD);
    root.render(<App />);
  } catch {
    root.render(
      <main role="alert" style={{ padding: 24 }}>
        Error de configuración: falta una URL de API HTTPS válida terminada en /api/v1.
      </main>,
    );
  }
}
