import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { initTelemetry } from '../lib/telemetry';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Initialize telemetry on app startup
    initTelemetry();
  }, []);

  return <Component {...pageProps} />;
}
