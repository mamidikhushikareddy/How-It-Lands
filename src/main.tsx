import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ToastProvider } from './components/ui/Toast.tsx';
import { installAuthFetchInterceptor } from './lib/authStorage';
import './index.css';

// Guarantee persistent cross-iframe session headers and cookie transmission
try {
  installAuthFetchInterceptor();
} catch (e) {
  console.warn('Auth interceptor setup skipped:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
