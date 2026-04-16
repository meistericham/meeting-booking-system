import React from 'react';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, message: error?.message || String(error) };
  }

  componentDidCatch(error: any, info: any) {
    // Keep console logging so we can diagnose on desktop.
    // This also helps when mobile users report a blank screen.
    console.error('UI crashed:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-lg font-semibold">Something went wrong</div>
          <div className="mt-2 text-sm text-white/70">
            The page failed to load. Please refresh or go back to the homepage.
          </div>
          {this.state.message && (
            <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-black/40 p-3 text-[11px] text-white/70">
              {this.state.message}
            </pre>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900"
            >
              Refresh
            </button>
            <a
              href="#/"
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
