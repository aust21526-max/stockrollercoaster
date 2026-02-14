import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { useStockData } from '../hooks/useStockData';
import { getRideGrade, calculateMaxDrawdown, getBadges, findPeakAndTrough, detectEvents } from '../utils/analysis';
import { useLang } from '../i18n/LanguageContext';
import RollercoasterChart from './RollercoasterChart';

const PortfolioMode = () => {
    const { t, lang } = useLang();
    const [tickers, setTickers] = useState([
        { ticker: '', weight: 50 },
        { ticker: '', weight: 50 },
    ]);
    const [startDate, setStartDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [result, setResult] = useState(null);

    const addTicker = () => {
        if (tickers.length >= 5) return;
        const remaining = 100 - tickers.reduce((s, t) => s + t.weight, 0);
        setTickers([...tickers, { ticker: '', weight: Math.max(0, remaining) }]);
    };

    const removeTicker = (idx) => {
        if (tickers.length <= 2) return;
        setTickers(tickers.filter((_, i) => i !== idx));
    };

    const updateTicker = (idx, field, value) => {
        const updated = [...tickers];
        updated[idx] = { ...updated[idx], [field]: field === 'weight' ? Number(value) : value.toUpperCase() };
        setTickers(updated);
    };

    const totalWeight = tickers.reduce((s, t) => s + t.weight, 0);

    const handleRide = async () => {
        if (!startDate || tickers.some(t => !t.ticker)) return;
        if (Math.abs(totalWeight - 100) > 0.01) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const today = new Date().toISOString().split('T')[0];
            const allData = [];

            for (const item of tickers) {
                const cacheKey = `rollercoaster-${item.ticker}-${startDate}-${today}`;
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    allData.push({ ...item, data: JSON.parse(cached) });
                    continue;
                }

                // Fetch from API (same as useStockData)
                const keys = ['b72294ade9554b9d81e5074a5a0c52a2', '0b6bda73abdb4b6d9b90a74189fdcbb7', '300a4be26d10484aba6c202b4c9f7635'];
                const apiKey = keys[Math.floor(Math.random() * keys.length)];
                const url = `https://api.twelvedata.com/time_series?symbol=${item.ticker}&interval=1day&start_date=${startDate}&end_date=${today}&outputsize=5000&apikey=${apiKey}`;
                const res = await fetch(url);
                const json = await res.json();

                if (json.status === 'error') throw new Error(`${item.ticker}: ${json.message}`);
                if (!json.values?.length) throw new Error(`No data for ${item.ticker}`);

                const sorted = json.values.map(v => ({
                    date: v.datetime,
                    close: parseFloat(v.close),
                    open: parseFloat(v.open),
                    high: parseFloat(v.high),
                    low: parseFloat(v.low),
                })).reverse();

                const result = { meta: json.meta, values: sorted };
                localStorage.setItem(cacheKey, JSON.stringify(result));
                allData.push({ ...item, data: result });
            }

            // Build date map for each ticker
            const dateMaps = allData.map(d => {
                const map = new Map();
                d.data.values.forEach(v => map.set(v.date, v));
                return { map, weight: d.weight / 100, ticker: d.ticker };
            });

            // Find common dates
            const allDates = [...dateMaps[0].map.keys()].filter(date =>
                dateMaps.every(dm => dm.map.has(date))
            );

            if (allDates.length < 2) throw new Error('Not enough overlapping data');

            // Calculate weighted portfolio
            const portfolioData = allDates.map((date, idx) => {
                let weightedReturn = 0;
                dateMaps.forEach(dm => {
                    const firstClose = dm.map.get(allDates[0]).close;
                    const currentClose = dm.map.get(date).close;
                    const returnPct = ((currentClose - firstClose) / firstClose) * 100;
                    weightedReturn += returnPct * dm.weight;
                });

                const basePrice = 100; // Normalize to 100
                const close = basePrice * (1 + weightedReturn / 100);
                let changePercent = 0;
                if (idx > 0) {
                    const prevDate = allDates[idx - 1];
                    let prevWeightedReturn = 0;
                    dateMaps.forEach(dm => {
                        const firstClose = dm.map.get(allDates[0]).close;
                        const prevClose = dm.map.get(prevDate).close;
                        const returnPct = ((prevClose - firstClose) / firstClose) * 100;
                        prevWeightedReturn += returnPct * dm.weight;
                    });
                    const prevClose = basePrice * (1 + prevWeightedReturn / 100);
                    changePercent = ((close - prevClose) / prevClose) * 100;
                }

                return { date, close, open: close, high: close, low: close, changePercent };
            });

            const totalReturn = ((portfolioData[portfolioData.length - 1].close - portfolioData[0].close) / portfolioData[0].close) * 100;
            const mddData = calculateMaxDrawdown(portfolioData);
            const rideGrade = getRideGrade(mddData.maxDrawdown, totalReturn);
            const durationDays = portfolioData.length;
            const badges = getBadges(totalReturn, mddData.maxDrawdown, durationDays);
            const events = detectEvents(portfolioData);
            const peakTrough = findPeakAndTrough(portfolioData);

            setResult({
                portfolioData,
                totalReturn,
                mddData,
                rideGrade,
                durationDays,
                badges,
                events,
                peakTrough,
                tickers: allData.map(d => d.ticker),
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                    <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-500 bg-clip-text text-transparent">
                        📊 Portfolio Rollercoaster
                    </h1>
                    <p className="text-slate-400 text-sm mt-2">Combine up to 5 stocks and ride them together!</p>
                </div>

                {/* Input */}
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 mb-6">
                    <div className="space-y-3">
                        {tickers.map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={item.ticker}
                                    onChange={e => updateTicker(i, 'ticker', e.target.value)}
                                    placeholder={`Ticker ${i + 1} (e.g. AAPL)`}
                                    className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500"
                                />
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={item.weight}
                                        onChange={e => updateTicker(i, 'weight', e.target.value)}
                                        className="w-16 px-2 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm text-center focus:outline-none focus:border-violet-500"
                                    />
                                    <span className="text-slate-400 text-sm">%</span>
                                </div>
                                {tickers.length > 2 && (
                                    <button onClick={() => removeTicker(i)} className="text-slate-500 hover:text-rose-400 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                        <div className={`text-sm font-mono ${Math.abs(totalWeight - 100) < 0.01 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            Total: {totalWeight}% {Math.abs(totalWeight - 100) < 0.01 ? '✅' : '(must be 100%)'}
                        </div>
                        {tickers.length < 5 && (
                            <button onClick={addTicker} className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition-colors">
                                <Plus className="w-4 h-4" /> Add Ticker
                            </button>
                        )}
                    </div>

                    <div className="mt-4">
                        <label className="text-slate-400 text-xs mb-1 block">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-violet-500"
                        />
                    </div>

                    <button
                        onClick={handleRide}
                        disabled={loading || !startDate || tickers.some(t => !t.ticker) || Math.abs(totalWeight - 100) > 0.01}
                        className="w-full mt-4 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white rounded-xl font-bold text-lg hover:from-violet-400 hover:to-fuchsia-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" /> Calculating...
                            </span>
                        ) : '🎢 Ride Portfolio!'}
                    </button>
                </div>

                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 mb-6">
                        <p className="text-rose-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <div className="space-y-6">
                        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
                            <h2 className="text-xl font-bold mb-4 text-center">
                                {result.rideGrade.emoji} Portfolio Ride — Grade {result.rideGrade.grade}
                            </h2>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                                    <p className="text-slate-400 text-xs">Total Return</p>
                                    <p className={`text-xl font-bold ${result.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {result.totalReturn >= 0 ? '+' : ''}{result.totalReturn.toFixed(1)}%
                                    </p>
                                </div>
                                <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                                    <p className="text-slate-400 text-xs">Max Drawdown</p>
                                    <p className="text-xl font-bold text-rose-400">
                                        -{(result.mddData.maxDrawdown * 100).toFixed(1)}%
                                    </p>
                                </div>
                                <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                                    <p className="text-slate-400 text-xs">Duration</p>
                                    <p className="text-lg font-bold text-slate-200">{result.durationDays} days</p>
                                </div>
                                <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                                    <p className="text-slate-400 text-xs">Stocks</p>
                                    <p className="text-lg font-bold text-slate-200">{result.tickers.join(', ')}</p>
                                </div>
                            </div>

                            {/* Badges */}
                            {result.badges.length > 0 && (
                                <div className="flex flex-wrap gap-2 justify-center mt-4">
                                    {result.badges.map(badge => (
                                        <span key={badge.id} className={`${badge.color} bg-slate-800 px-3 py-1 rounded-full text-xs font-bold border border-slate-700`}>
                                            {badge.emoji} {t(badge.nameKey)}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Chart */}
                        <RollercoasterChart
                            data={result.portfolioData}
                            ticker="PORTFOLIO"
                            events={result.events}
                            peakTrough={result.peakTrough}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default PortfolioMode;
