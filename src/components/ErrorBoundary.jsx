import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
                    <div className="bg-slate-900 p-8 rounded-2xl border border-rose-500/30 max-w-2xl w-full">
                        <h1 className="text-3xl font-black text-rose-500 mb-4">💥 CRITICAL ERROR (오류 발생)</h1>
                        <p className="text-slate-400 mb-6">애플리케이션 실행 중 심각한 오류가 발생했습니다. 아래 내용을 캡처해서 알려주세요.</p>

                        <div className="bg-black/50 p-4 rounded-xl border border-slate-800 overflow-auto max-h-96 font-mono text-xs text-rose-300 mb-4">
                            <p className="font-bold mb-2 text-rose-400">{this.state.error?.toString()}</p>
                            <pre className="whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
                        </div>

                        <button
                            onClick={() => window.location.href = '/'}
                            className="w-full px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors border border-slate-700 hover:border-slate-500 mb-2"
                        >
                            🏠 홈으로 이동 (초기화)
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-rose-500/20"
                        >
                            🔄 페이지 새로고침
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
