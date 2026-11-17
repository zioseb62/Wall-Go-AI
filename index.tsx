import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{color: 'red', padding: 20}}><h1>Something went wrong.</h1><pre>{this.state.error && String(this.state.error)}</pre></div>;
    }
    return this.props.children;
  }
}

const originalJSONParse = JSON.parse;
(JSON as any).parse = function(text: any, reviver?: any) {
  if (text === undefined || text === "undefined") {
    console.warn('Caught JSON.parse(undefined|"undefined"). Returning fallback null');
    return null;
  }
  return originalJSONParse(text, reviver);
};

declare global {
  interface Window {
    bridge?: any;
    Capacitor?: any;
  }
}

// On native Android (Capacitor), assets are bundled locally inside the APK/AAB.
// Never register a PWA Service Worker on native, and purge any stale SW/CacheStorage from older builds.
if (typeof window !== 'undefined') {
  if (Capacitor.isNativePlatform()) {
    const cleanupNativeSW = async () => {
      try {
        const hadController = Boolean(navigator.serviceWorker?.controller);
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((reg) => reg.unregister()));
        }
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
        if (hadController && !sessionStorage.getItem('wallgo_sw_purged')) {
          sessionStorage.setItem('wallgo_sw_purged', '1');
          window.location.reload();
        }
      } catch {
        // Ignore cleanup errors on restricted WebViews
      }
    };
    cleanupNativeSW();
  } else if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
    });
  }
}

function renderApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error("Could not find root element to mount to");
  }
  console.log("App component:", App);
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}

renderApp();
