import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSentry } from './lib/sentry';

// Initialize Sentry antes do primeiro render. No-op em DEV / sem DSN.
initSentry();

createRoot(document.getElementById('root')!).render(<App />);
