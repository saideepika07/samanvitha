import React from 'react';
import { Button } from './Button.jsx';
import { AlertCircle, RotateCcw } from 'lucide-react';

export function ErrorState({
  icon: Icon = AlertCircle,
  title = 'Unable to Load Data',
  message = 'A network or server error occurred while retrieving this information.',
  onRetry,
  retryLabel = 'Retry',
  className = '',
}) {
  const displayMessage =
    typeof message === 'string'
      ? message
      : message?.message || 'An unexpected error occurred. Please try again.';

  return (
    <div
      className={`bg-white rounded-3xl border border-sand-200 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-soft-sm space-y-4 ${className}`}
      role="alert"
    >
      <div className="w-14 h-14 rounded-2xl bg-terracotta-50 border border-terracotta-200 flex items-center justify-center mx-auto text-terracotta-700">
        <Icon className="w-7 h-7 text-terracotta-600" />
      </div>

      <div className="space-y-2">
        <h3 className="font-serif text-xl font-bold text-charcoal-900">{title}</h3>
        <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed max-w-sm mx-auto break-words">
          {displayMessage}
        </p>
      </div>

      {onRetry && (
        <div className="pt-2">
          <Button variant="primary" size="sm" onClick={onRetry} icon={RotateCcw}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default ErrorState;
