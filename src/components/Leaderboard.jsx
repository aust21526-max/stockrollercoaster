import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, TrendingUp, TrendingDown, Flame, ArrowLeft, RefreshCw, Puzzle } from 'lucide-react';

const API_BASE = '/api/leaderboard';

const TABS = [
    { key: 'thrilling', label: '🎢 Most Thrilling', icon: Flame, desc: 'Highest MDD — the wildest rides' },
    { key: 'best', label: '🚀 Best Return', icon: TrendingUp, desc: 'Highest profit rides' },
    { key: 'worst', label: '💀 Worst Return', icon: TrendingDown, desc: 'The most painful rides' },
    { key: 'mystery', label: '🧩 Mystery Ride', icon: Puzzle, desc: 'Most correct guesses in Mystery Ride' },
];

const Leaderboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState('thrilling');

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(API_BASE);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setData(json);
        } catch (err) {
            console.error('Leaderboard fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const getTimeUntilReset = () => {
        const now = new Date();
        const tmrw = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
        const diff = tmrw - now;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    };

    const entries = data ? data[tab] || [] : [];
    const isMystery = tab === 'mystery';

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Link>
                    <button onClick={fetchData} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-sm">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                        🏆 Today's Top Riders
                    </h1>
                    <p className="text-slate-400 text-sm mt-2">
                        Resets daily · Next reset in <span className="text-amber-400 font-mono">{getTimeUntilReset()}</span>
                    </p>
                    {data && <p className="text-slate-500 text-xs mt-1">{data.total} riders today</p>}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${tab === t.key
                                ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:text-white hover:border-slate-600'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Description */}
                <p className="text-slate-500 text-xs mb-4">
                    {TABS.find(t => t.key === tab)?.desc}
                </p>

                {/* Content */}
                {loading && (
                    <div className="text-center py-16">
                        <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-400">Loading leaderboard...</p>
                    </div>
                )}

                {error && (
                    <div className="text-center py-16">
                        <p className="text-rose-400 mb-2">Failed to load leaderboard</p>
                        <p className="text-slate-500 text-sm">{error}</p>
                        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors">
                            Try Again
                        </button>
                    </div>
                )}

                {!loading && !error && entries.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-slate-400 text-2xl mb-2">🏜️</p>
                        <p className="text-slate-400">No rides today yet. Be the first!</p>
                    </div>
                )}

                {!loading && !error && entries.length > 0 && (
                    <div className="space-y-2">
                        {entries.map((entry, i) => {
                            const isTop3 = i < 3;
                            const medals = ['🥇', '🥈', '🥉'];
                            const rankDisplay = isTop3 ? medals[i] : `#${i + 1}`;

                            return (
                                <div
                                    key={entry.id || i}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isTop3
                                        ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/30'
                                        : 'bg-slate-800/40 border border-slate-700/30 hover:border-slate-600/50'
                                        }`}
                                >
                                    {/* Rank */}
                                    <div className={`text-lg font-bold min-w-[2.5rem] text-center ${isTop3 ? '' : 'text-slate-500 text-sm'}`}>
                                        {rankDisplay}
                                    </div>

                                    {/* Grade Emoji */}
                                    <div className="text-xl">{entry.emoji}</div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold truncate ${isTop3 ? 'text-amber-200' : 'text-slate-200'}`}>
                                                {entry.nickname}
                                            </span>
                                            {!isMystery && (
                                                <span className="text-slate-500 text-xs font-mono">{entry.ticker}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="text-right">
                                        {isMystery ? (
                                            <>
                                                <div className="font-bold text-sm text-amber-400">
                                                    {entry.returnPct} correct
                                                </div>
                                                <div className="text-slate-500 text-xs">
                                                    {entry.mdd}% accuracy
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className={`font-bold text-sm ${entry.returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {entry.returnPct >= 0 ? '+' : ''}{entry.returnPct}%
                                                </div>
                                                <div className="text-slate-500 text-xs">
                                                    MDD -{entry.mdd}%
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Grade */}
                                    <div className="text-xs font-bold text-slate-400 bg-slate-700/50 px-2 py-1 rounded-md min-w-[2rem] text-center">
                                        {entry.grade}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* CTA */}
                <div className="flex justify-center gap-3 mt-8 flex-wrap">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-bold hover:from-cyan-400 hover:to-blue-500 transition-all"
                    >
                        🎢 Ride Now & Compete!
                    </Link>
                    <Link
                        to="/challenge"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 text-amber-400 rounded-full font-bold hover:bg-slate-700 transition-all border border-amber-500/30"
                    >
                        🧩 Mystery Ride
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
