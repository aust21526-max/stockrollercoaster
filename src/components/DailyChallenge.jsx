import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Flame, Check, X, RefreshCw } from 'lucide-react';
import { useStockData } from '../hooks/useStockData';
import RollercoasterChart from './RollercoasterChart';

// Pool of well-known stocks
const STOCK_POOL = [
    'AAPL', 'TSLA', 'NVDA', 'AMZN', 'GOOGL', 'META', 'MSFT', 'NFLX',
    'AMD', 'PLTR', 'COIN', 'SQ', 'SHOP', 'PYPL', 'UBER', 'ABNB',
    'DIS', 'BA', 'JPM', 'GS', 'V', 'MA', 'WMT', 'COST',
    'NKE', 'SBUX', 'MCD', 'PEP', 'KO', 'PFE',
];

// Deterministic seed based on 10-minute window
function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function getCurrentRoundId() {
    // Each round = 10 minutes
    return Math.floor(Date.now() / (10 * 60 * 1000));
}

function getMysteryRide(roundId) {
    const seed = roundId * 7919; // Prime-based seed

    // Pick ticker
    const tickerIdx = Math.floor(seededRandom(seed) * STOCK_POOL.length);
    const correctTicker = STOCK_POOL[tickerIdx];

    // Pick start date (1~5 years ago)
    const yearsBack = 1 + Math.floor(seededRandom(seed + 1) * 4);
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - yearsBack);
    const startStr = startDate.toISOString().split('T')[0];

    // Pick 3 wrong answers
    const wrongs = new Set();
    let i = 2;
    while (wrongs.size < 3) {
        const idx = Math.floor(seededRandom(seed + i) * STOCK_POOL.length);
        if (STOCK_POOL[idx] !== correctTicker) wrongs.add(STOCK_POOL[idx]);
        i++;
    }

    // Shuffle options
    const options = [correctTicker, ...wrongs];
    for (let j = options.length - 1; j > 0; j--) {
        const k = Math.floor(seededRandom(seed + 100 + j) * (j + 1));
        [options[j], options[k]] = [options[k], options[j]];
    }

    return { correctTicker, startDate: startStr, options, roundId };
}

function getStats() {
    const raw = localStorage.getItem('mystery-stats');
    if (!raw) return { correct: 0, total: 0, streak: 0, lastRound: 0 };
    return JSON.parse(raw);
}

function updateStats(roundId, isCorrect) {
    const old = getStats();
    if (old.lastRound === roundId) return; // Already played this round

    const newStreak = isCorrect ? (old.lastRound === roundId - 1 ? old.streak + 1 : 1) : 0;
    const updated = {
        correct: old.correct + (isCorrect ? 1 : 0),
        total: old.total + 1,
        streak: newStreak,
        lastRound: roundId,
    };
    localStorage.setItem('mystery-stats', JSON.stringify(updated));

    // Submit to leaderboard
    if (updated.correct > 0) {
        submitChallengeScore(updated);
    }
}

async function submitChallengeScore(stats) {
    try {
        const nickname = localStorage.getItem('mystery-nickname') || `Rider_${Math.random().toString(36).slice(2, 6)}`;
        await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nickname,
                ticker: 'MYSTERY',
                returnPct: stats.correct,
                mdd: stats.total > 0 ? parseFloat(((stats.correct / stats.total) * 100).toFixed(1)) : 0,
                grade: `${stats.correct}/${stats.total}`,
                emoji: '🧩',
                startDate: new Date().toISOString().split('T')[0],
                isChallenge: true,
            }),
        });
    } catch (e) {
        // Silent fail
    }
}

function getRoundResult(roundId) {
    const raw = localStorage.getItem(`mystery-round-${roundId}`);
    return raw ? JSON.parse(raw) : null;
}

function saveRoundResult(roundId, result) {
    localStorage.setItem(`mystery-round-${roundId}`, JSON.stringify(result));
}

const DailyChallenge = () => {
    const [roundId, setRoundId] = useState(getCurrentRoundId());
    const challenge = useMemo(() => getMysteryRide(roundId), [roundId]);
    const { stockData, loading, error, fetchStockHistory } = useStockData();
    const [selected, setSelected] = useState(null);
    const [revealed, setRevealed] = useState(false);
    const [stats, setStats] = useState(getStats());
    const [countdown, setCountdown] = useState('');

    const existingResult = useMemo(() => getRoundResult(challenge.roundId), [challenge.roundId]);

    useEffect(() => {
        fetchStockHistory(challenge.correctTicker, challenge.startDate);
    }, [challenge.correctTicker, challenge.startDate]);

    useEffect(() => {
        if (existingResult) {
            setSelected(existingResult.selected);
            setRevealed(true);
        } else {
            setSelected(null);
            setRevealed(false);
        }
    }, [existingResult, roundId]);

    // Countdown timer
    useEffect(() => {
        const tick = () => {
            const now = Date.now();
            const nextRound = (getCurrentRoundId() + 1) * (10 * 60 * 1000);
            const diff = nextRound - now;
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            setCountdown(`${mins}m ${String(secs).padStart(2, '0')}s`);

            // Auto-switch when new round starts
            const newRoundId = getCurrentRoundId();
            if (newRoundId !== roundId) {
                setRoundId(newRoundId);
            }
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [roundId]);

    const handleGuess = (ticker) => {
        if (revealed) return;
        setSelected(ticker);
        setRevealed(true);

        const correct = ticker === challenge.correctTicker;
        updateStats(challenge.roundId, correct);
        setStats(getStats());
        saveRoundResult(challenge.roundId, { selected: ticker, correct });
    };

    const isCorrect = selected === challenge.correctTicker;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-8">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Link>
                    <div className="flex items-center gap-3">
                        {stats.streak > 0 && (
                            <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                                <Flame className="w-4 h-4" /> {stats.streak} streak
                            </div>
                        )}
                        <div className="text-slate-500 text-xs font-mono bg-slate-800/50 px-2 py-1 rounded-lg">
                            {stats.correct}/{stats.total} correct
                        </div>
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                        🧩 Mystery Ride
                    </h1>
                    <p className="text-slate-400 text-sm mt-2">
                        Can you guess which stock this rollercoaster belongs to?
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                        New mystery in <span className="text-amber-400 font-mono">{countdown}</span> · Updates every 10 min
                    </p>
                </div>

                {/* Chart */}
                {loading && (
                    <div className="text-center py-16">
                        <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-400">Loading mystery chart...</p>
                    </div>
                )}

                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 mb-6 text-center">
                        <p className="text-rose-400 text-sm">{error}</p>
                    </div>
                )}

                {stockData.length > 0 && (
                    <div className="mb-8">
                        <div className="bg-slate-800/30 rounded-2xl border border-slate-700/30 p-4">
                            <div className="text-center mb-2">
                                <span className="text-slate-500 text-sm font-mono">
                                    {revealed ? `Answer: ${challenge.correctTicker}` : '??? — Guess the stock!'}
                                </span>
                            </div>
                            <RollercoasterChart
                                data={stockData}
                                ticker={revealed ? challenge.correctTicker : '???'}
                                events={[]}
                                peakTrough={{ peak: null, trough: null }}
                            />
                        </div>
                    </div>
                )}

                {/* Options */}
                {stockData.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mb-8">
                        {challenge.options.map(ticker => {
                            let btnClass = 'bg-slate-800/60 border-slate-700/50 text-slate-200 hover:border-amber-500/50 hover:bg-slate-800';
                            if (revealed) {
                                if (ticker === challenge.correctTicker) {
                                    btnClass = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300';
                                } else if (ticker === selected) {
                                    btnClass = 'bg-rose-500/20 border-rose-500/50 text-rose-300';
                                } else {
                                    btnClass = 'bg-slate-800/30 border-slate-700/30 text-slate-500';
                                }
                            }

                            return (
                                <button
                                    key={ticker}
                                    onClick={() => handleGuess(ticker)}
                                    disabled={revealed}
                                    className={`flex items-center justify-center gap-2 px-4 py-4 rounded-xl border font-bold text-lg transition-all ${btnClass} ${!revealed ? 'active:scale-95' : ''}`}
                                >
                                    {revealed && ticker === challenge.correctTicker && <Check className="w-5 h-5" />}
                                    {revealed && ticker === selected && ticker !== challenge.correctTicker && <X className="w-5 h-5" />}
                                    {ticker}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Result */}
                {revealed && (
                    <div className={`text-center p-6 rounded-2xl border mb-8 ${isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-rose-500/10 border-rose-500/30'
                        }`}>
                        <p className="text-4xl mb-2">{isCorrect ? '🎉' : '😅'}</p>
                        <p className={`text-xl font-bold ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isCorrect ? 'Correct!' : `Wrong! It was ${challenge.correctTicker}`}
                        </p>
                        {stats.streak > 0 && isCorrect && (
                            <p className="text-amber-400 text-sm mt-2">
                                🔥 {stats.streak} streak! Keep it going!
                            </p>
                        )}
                        <p className="text-slate-400 text-xs mt-3">
                            Next mystery in <span className="text-amber-400 font-mono">{countdown}</span>
                        </p>
                    </div>
                )}

                <div className="flex justify-center gap-3">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-bold hover:from-cyan-400 hover:to-blue-500 transition-all"
                    >
                        🎢 Try Your Own Ride
                    </Link>
                    <Link
                        to="/leaderboard"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 text-amber-400 rounded-full font-bold hover:bg-slate-700 transition-all border border-amber-500/30"
                    >
                        🏆 Leaderboard
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default DailyChallenge;
