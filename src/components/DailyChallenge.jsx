import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Flame, Check, X } from 'lucide-react';
import { useStockData } from '../hooks/useStockData';
import RollercoasterChart from './RollercoasterChart';

// Pool of well-known stocks for daily challenge
const STOCK_POOL = [
    'AAPL', 'TSLA', 'NVDA', 'AMZN', 'GOOGL', 'META', 'MSFT', 'NFLX',
    'AMD', 'PLTR', 'COIN', 'SQ', 'SHOP', 'PYPL', 'UBER', 'ABNB',
    'DIS', 'BA', 'JPM', 'GS', 'V', 'MA', 'WMT', 'COST',
    'NKE', 'SBUX', 'MCD', 'PEP', 'KO', 'PFE',
];

// Deterministic seed based on today's date
function seededRandom(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function getDailyChallenge() {
    const now = new Date();
    const daysSinceEpoch = Math.floor(now.getTime() / 86400000);
    const seed = daysSinceEpoch * 7919; // Prime-based seed

    // Pick ticker
    const tickerIdx = Math.floor(seededRandom(seed) * STOCK_POOL.length);
    const correctTicker = STOCK_POOL[tickerIdx];

    // Pick start date (random date from past 1-5 years)
    const yearsBack = 1 + Math.floor(seededRandom(seed + 1) * 4);
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - yearsBack);
    const startStr = startDate.toISOString().split('T')[0];

    // Pick 3 wrong answers (unique, not the correct one)
    const wrongs = new Set();
    let i = 2;
    while (wrongs.size < 3) {
        const idx = Math.floor(seededRandom(seed + i) * STOCK_POOL.length);
        if (STOCK_POOL[idx] !== correctTicker) wrongs.add(STOCK_POOL[idx]);
        i++;
    }

    // Create shuffled options
    const options = [correctTicker, ...wrongs];
    // Shuffle deterministically
    for (let j = options.length - 1; j > 0; j--) {
        const k = Math.floor(seededRandom(seed + 100 + j) * (j + 1));
        [options[j], options[k]] = [options[k], options[j]];
    }

    return { correctTicker, startDate: startStr, options, dayId: daysSinceEpoch };
}

function getStreak() {
    const raw = localStorage.getItem('challenge-streak');
    if (!raw) return { count: 0, lastDay: 0 };
    return JSON.parse(raw);
}

function updateStreak(dayId, correct) {
    const old = getStreak();
    if (correct) {
        if (old.lastDay === dayId - 1 || old.lastDay === dayId) {
            localStorage.setItem('challenge-streak', JSON.stringify({
                count: old.lastDay === dayId ? old.count : old.count + 1,
                lastDay: dayId,
            }));
        } else {
            localStorage.setItem('challenge-streak', JSON.stringify({ count: 1, lastDay: dayId }));
        }
    } else {
        localStorage.setItem('challenge-streak', JSON.stringify({ count: 0, lastDay: dayId }));
    }
}

function getTodayResult(dayId) {
    const raw = localStorage.getItem(`challenge-result-${dayId}`);
    return raw ? JSON.parse(raw) : null;
}

function saveTodayResult(dayId, result) {
    localStorage.setItem(`challenge-result-${dayId}`, JSON.stringify(result));
}

const DailyChallenge = () => {
    const challenge = useMemo(() => getDailyChallenge(), []);
    const { stockData, loading, error, fetchStockHistory } = useStockData();
    const [selected, setSelected] = useState(null);
    const [revealed, setRevealed] = useState(false);
    const [streak, setStreak] = useState(getStreak());

    // Check if already played today
    const existingResult = useMemo(() => getTodayResult(challenge.dayId), [challenge.dayId]);

    useEffect(() => {
        fetchStockHistory(challenge.correctTicker, challenge.startDate);
    }, [challenge.correctTicker, challenge.startDate]);

    useEffect(() => {
        if (existingResult) {
            setSelected(existingResult.selected);
            setRevealed(true);
        }
    }, [existingResult]);

    const handleGuess = (ticker) => {
        if (revealed) return;
        setSelected(ticker);
        setRevealed(true);

        const correct = ticker === challenge.correctTicker;
        updateStreak(challenge.dayId, correct);
        setStreak(getStreak());
        saveTodayResult(challenge.dayId, { selected: ticker, correct });
    };

    const isCorrect = selected === challenge.correctTicker;

    const getTimeUntilNextChallenge = () => {
        const now = new Date();
        const tmrw = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
        const diff = tmrw - now;
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-8">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Link>
                    {streak.count > 0 && (
                        <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
                            <Flame className="w-4 h-4" /> {streak.count}-day streak!
                        </div>
                    )}
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                        📅 Daily Mystery Ride
                    </h1>
                    <p className="text-slate-400 text-sm mt-2">
                        Can you guess which stock this rollercoaster belongs to?
                    </p>
                    <p className="text-slate-500 text-xs mt-1">
                        Next challenge in <span className="text-amber-400 font-mono">{getTimeUntilNextChallenge()}</span>
                    </p>
                </div>

                {/* Chart (without ticker label) */}
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
                            let btnClass = 'bg-slate-800/60 border-slate-700/50 text-slate-200 hover:border-amber-500/50';
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
                        {streak.count > 0 && isCorrect && (
                            <p className="text-amber-400 text-sm mt-2">
                                🔥 {streak.count}-day streak! Keep it going!
                            </p>
                        )}
                        <p className="text-slate-400 text-xs mt-3">
                            Come back tomorrow for a new challenge!
                        </p>
                    </div>
                )}

                <div className="text-center">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-bold hover:from-cyan-400 hover:to-blue-500 transition-all"
                    >
                        🎢 Try Your Own Ride
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default DailyChallenge;
