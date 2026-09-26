import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // In a real production app, you would send this to Sentry or Datadog
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-base flex items-center justify-center text-neutral-200 p-6 font-sans">
                    <div className="max-w-md w-full bg-card border border-raised rounded-2xl p-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mb-6 ring-1 ring-inset ring-red-500/20">
                            <AlertTriangle className="text-red-400" size={22} aria-hidden="true" />
                        </div>

                        <h1 className="text-[22px] font-semibold text-neutral-50 mb-2 tracking-[-0.02em]">Something went wrong</h1>
                        <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
                            This page hit an unexpected error. Reloading usually fixes it; if it keeps happening, the details below explain what broke.
                        </p>

                        {/* Error Message Details (Helpful for debugging during viva) */}
                        {this.state.error && (
                            <div className="w-full bg-base border border-raised rounded-lg p-4 mb-8 overflow-auto text-left max-h-32 custom-scrollbar">
                                <p className="text-xs font-mono text-red-400 whitespace-pre-wrap break-words">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-4 w-full">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-neutral-50 hover:bg-white text-[var(--color-base)] rounded-lg text-sm font-semibold transition-colors"
                            >
                                <RefreshCw size={16} /> Reload Page
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-raised hover:bg-edge text-neutral-100 border border-edge rounded-lg text-sm font-semibold transition-colors"
                                title="Return Home"
                                aria-label="Return home"
                            >
                                <Home size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // If there is no error, render the normal app components
        return this.props.children;
    }
}

export default ErrorBoundary;