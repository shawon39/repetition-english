import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './App';
import { StoreProvider } from './lib/store';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/noto-sans-bengali';
import './styles/tokens.css';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <HashRouter>
    <StoreProvider>
      <App />
    </StoreProvider>
  </HashRouter>,
);
