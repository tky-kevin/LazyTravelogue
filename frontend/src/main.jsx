import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ItineraryProvider } from './context/ItineraryContext';
import './index.css';
import 'react-datepicker/dist/react-datepicker.css';
import App from './App.jsx';
import SharedItineraryView from './components/SharedItineraryView.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID_PLACEHOLDER";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ItineraryProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/share/:token" element={<SharedItineraryView />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </BrowserRouter>
      </ItineraryProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);
