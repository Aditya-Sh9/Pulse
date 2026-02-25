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
                <div className="min-h-screen bg-[#0F1117] flex items-center justify-center text-gray-200 p-6 font-sans">
                    <div className="max-w-md w-full bg-[#1E1F21]/80 backdrop-blur-xl border border-red-500/30 rounded-2xl p-8 shadow-2xl shadow-red-900/10 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                            <AlertTriangle className="text-red-400" size={32} />
                        </div>

                        <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Something went wrong</h1>
                        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                            An unexpected error occurred while rendering this page. Our team has been notified. Please try refreshing or return home.
                        </p>

                        {/* Error Message Details (Helpful for debugging during viva) */}
                        {this.state.error && (
                            <div className="w-full bg-[#111] border border-[#2B2D31] rounded-lg p-4 mb-8 overflow-auto text-left max-h-32 custom-scrollbar">
                                <p className="text-xs font-mono text-red-400 whitespace-pre-wrap break-words">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-4 w-full">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-purple-500/20"
                            >
                                <RefreshCw size={16} /> Reload Page
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#2B2D31] hover:bg-[#3E4045] text-white border border-[#3E4045] rounded-xl text-sm font-bold transition-all"
                                title="Return Home"
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