import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorNotifications from './components/ErrorNotifications';
import './styles.css';
createRoot(document.getElementById('root')).render(<React.StrictMode><ErrorNotifications /><App /></React.StrictMode>);
