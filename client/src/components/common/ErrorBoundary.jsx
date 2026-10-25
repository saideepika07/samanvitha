import React from 'react';
import { Button } from './Button.jsx';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught runtime error:', error?.message || error);
    if (error?.stack) {
      console.error('Runtime error stack trace:\n' + error.stack);
    }
    if (errorInfo?.componentStack) {
      console.error('Component stack:\n' + errorInfo.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-sand-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-sand-200 p-8 max-w-lg w-full text-center shadow-soft-lg space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="font-serif text-2xl font-bold text-charcoal-900">
                Something went wrong
              </h2>
              <p className="text-xs text-charcoal-600 leading-relaxed">
                An unexpected application interface error occurred. You can safely return to the main network home.
              </p>
              {import.meta.env?.DEV && this.state.error && (
                <div className="mt-4 text-left p-3.5 rounded-2xl bg-red-50/70 border border-red-200 text-red-950 font-mono text-xs overflow-auto max-h-48 space-y-1">
                  <p className="font-bold text-red-800">{this.state.error.toString()}</p>
                  {this.state.error.stack && (
                    <pre className="text-[10px] whitespace-pre-wrap opacity-75 font-mono">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-center gap-3">
              <Button
                variant="primary"
                size="sm"
                icon={Home}
                onClick={this.handleReset}
              >
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
