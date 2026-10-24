import { createRoot } from 'react-dom/client';
import App from './App';
import { applyTokens } from './design/tokens';
import './design/global.css';
import './design/office.css';
import './design/workspace.css';

applyTokens();
createRoot(document.getElementById('root')!).render(<App />);
