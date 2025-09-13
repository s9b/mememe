import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { initTelemetry } from '../lib/telemetry';
import { ThemeProvider } from '../lib/ThemeContext';
import { FeedbackModal } from '../components/FeedbackModal';

export default function App({ Component, pageProps }: AppProps) {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    // Initialize telemetry on app startup
    initTelemetry();
  }, []);

  return (
    <ThemeProvider>
      <Component {...pageProps} />
      
      {/* Global Feedback Button */}
      <button
        onClick={() => setShowFeedbackModal(true)}
        className="fixed bottom-4 right-4 z-40 bg-purple-600 hover:bg-purple-700 text-white 
                   rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-105
                   flex items-center space-x-2 group"
        aria-label="Send Feedback"
      >
        <span className="text-xl">💬</span>
        <span className="hidden group-hover:block text-sm font-medium whitespace-nowrap">
          Feedback
        </span>
      </button>
      
      {/* Feedback Modal */}
      <FeedbackModal 
        isOpen={showFeedbackModal} 
        onClose={() => setShowFeedbackModal(false)} 
      />
      
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-text)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid var(--toast-border)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            fontWeight: '500',
            fontSize: '14px',
            maxWidth: '500px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
            style: {
              border: '1px solid #10b981',
              background: 'var(--toast-success-bg)',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
            style: {
              border: '1px solid #ef4444',
              background: 'var(--toast-error-bg)',
            },
          },
          loading: {
            iconTheme: {
              primary: '#8b5cf6',
              secondary: '#ffffff',
            },
            style: {
              border: '1px solid #8b5cf6',
              background: 'var(--toast-loading-bg)',
            },
          },
        }}
      />
    </ThemeProvider>
  );
}
