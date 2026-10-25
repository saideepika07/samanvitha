import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './hooks/AuthContext.jsx';
import { ToastProvider } from './hooks/useToast.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import { USE_MOCK_DATA } from './config/featureFlags.js';
import { AlertTriangle } from 'lucide-react';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        {USE_MOCK_DATA && (
          <div
            className="bg-amber-500 text-amber-950 font-semibold text-xs sm:text-sm py-2 px-4 text-center sticky top-0 z-50 shadow-sm flex items-center justify-center gap-2 select-none border-b border-amber-600"
            role="status"
          >
            <AlertTriangle className="w-4 h-4 text-amber-950 flex-shrink-0" />
            <span>
              <strong>Mock Mode Active:</strong> Running with prototype mock data store (USE_MOCK_DATA = true).
            </span>
          </div>
        )}
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
