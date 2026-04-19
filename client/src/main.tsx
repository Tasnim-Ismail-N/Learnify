import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n/i18n';
import './index.css';
import { Providers } from './app/Providers';
import { AppRouter } from './app/Router';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <AppRouter />
    </Providers>
  </React.StrictMode>
);
