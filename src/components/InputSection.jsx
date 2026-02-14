import React, { useState } from 'react';
import { Calendar, Zap, ChevronDown, ChevronUp, DollarSign, Hash, RotateCcw } from 'lucide-react';
import { POPULAR_TICKERS } from '../utils/analysis';
import { useLang } from '../i18n/LanguageContext';

// 빠른 날짜 프리셋 키
const DATE_PRESET_KEYS = [
    { labelKey: 'preset1m', months: 1 },
    { labelKey: 'preset3m', months: 3 },
    { labelKey: 'preset6m', months: 6 },
    { labelKey: 'preset1y', months: 12 },
    { labelKey: 'preset2y', months: 24 },
    { labelKey: 'preset3y', months: 36 },
    { labelKey: 'preset5y', months: 60 },
    { labelKey: 'presetYTD', isYTD: true },
];

function getPresetDate(preset) {
    const now = new Date();
    if (preset.isYTD) {
        return `${now.getFullYear()}-01-01`;
    }
    const target = new Date(now);
    target.setMonth(target.getMonth() - preset.months);
    return target.toISOString().split('T')[0];
}

const InputSection = ({ onRideStart, loading, battleInfo }) => {
    const { t } = useLang();
    const [ticker, setTicker] = useState('');
    const [date, setDate] = useState('');
    const [avgPrice, setAvgPrice] = useState('');
    const [quantity, setQuantity] = useState('');
    const [comparisonTicker, setComparisonTicker] = useState('');
    const [showComparison, setShowComparison] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [activePreset, setActivePreset] = useState(null);

    // Battle Mode Pre-fill
    React.useEffect(() => {
        if (battleInfo?.ticker) {
            setTicker(battleInfo.ticker);
        }
    }, [battleInfo]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (ticker && date) {
            onRideStart(ticker.toUpperCase(), date, {
                avgPrice: avgPrice ? parseFloat(avgPrice) : null,
                quantity: quantity ? parseInt(quantity, 10) : null,
                comparisonTicker: showComparison && comparisonTicker ? comparisonTicker.toUpperCase() : null
            });
        }
    };

    const handleQuickPick = (tk) => {
        setTicker(tk);
    };

    const handlePresetDate = (preset, index) => {
        setDate(getPresetDate(preset));
        setActivePreset(index);
    };

    const handleClearCache = () => {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('rollercoaster-'));
        keys.forEach(k => localStorage.removeItem(k));
        alert(`Cleared ${keys.length} cached items.`);
    };

    return (
        <div className="w-full max-w-lg mx-auto">
            {/* Battle Mode Banner */}
            {battleInfo && (
                <div className="mb-6 p-4 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl shadow-lg shadow-violet-500/20 animate-pulse border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl italic transform rotate-12 pointer-events-none">
                        VS
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                {t('battleChallenger')}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">
                            {t('battleBannerMsg')(battleInfo.name)}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-indigo-100">
                            <span>{t('battleTarget')}:</span>
                            <span className="font-mono font-bold bg-black/20 px-1.5 rounded text-white">
                                {battleInfo.ticker}
                            </span>
                            <span className={`font-mono font-bold px-1.5 rounded ${battleInfo.returnRate >= 0 ? 'bg-emerald-500/30 text-emerald-200' : 'bg-rose-500/30 text-rose-200'}`}>
                                {battleInfo.returnRate > 0 ? '+' : ''}{battleInfo.returnRate}%
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6 md:p-8 bg-slate-800/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl shadow-cyan-500/5">
                <h2 className="text-2xl font-black text-center mb-1 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                    {t('readyToRide')}
                </h2>
                <p className="text-slate-500 text-sm text-center mb-6">{t('readyToRideDesc')}</p>

                {/* Quick Pick Buttons */}
                <div className="mb-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> {t('popularTickers')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {POPULAR_TICKERS.map((tk) => (
                            <button
                                key={tk.ticker}
                                type="button"
                                onClick={() => handleQuickPick(tk.ticker)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                                    ${ticker === tk.ticker
                                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 scale-105'
                                        : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-white'
                                    }`}
                            >
                                {tk.emoji} {tk.ticker}
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="text-sm font-medium text-slate-400">
                                {t('tickerLabel')}
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowComparison(!showComparison)}
                                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                            >
                                <span className="bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                                    {showComparison ? '➖' : 'VS'} {t('comparisonToggle')}
                                </span>
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={ticker}
                                onChange={(e) => setTicker(e.target.value)}
                                placeholder="TSLA"
                                className={`w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none text-white placeholder-slate-600 transition-all text-lg uppercase font-bold tracking-wider ${showComparison ? 'rounded-b-none border-b-0' : ''}`}
                                required
                            />
                        </div>

                        {/* Comparison Input (Animated) */}
                        <div className={`overflow-hidden transition-all duration-300 ease-out ${showComparison ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="relative">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-rose-400 bg-rose-500/10 px-1.5 rounded border border-rose-500/20">VS</div>
                                <input
                                    type="text"
                                    value={comparisonTicker}
                                    onChange={(e) => setComparisonTicker(e.target.value)}
                                    placeholder={t('comparisonPlaceholder')}
                                    className="w-full pl-14 pr-4 py-3 bg-slate-900/60 border border-slate-700/50 rounded-b-xl border-t-0 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none text-white placeholder-slate-600 transition-all text-base uppercase font-bold tracking-wider"
                                />
                                {/* Quick Compare Buttons */}
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setComparisonTicker('SPY')}
                                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 hover:text-white rounded border border-slate-700 transition-colors"
                                    >
                                        SPY
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setComparisonTicker('QQQ')}
                                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 hover:text-white rounded border border-slate-700 transition-colors"
                                    >
                                        QQQ
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">
                            {t('dateLabel')}
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {DATE_PRESET_KEYS.map((preset, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => handlePresetDate(preset, i)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border
                                        ${activePreset === i
                                            ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                            : 'bg-slate-900/40 border-slate-700/30 text-slate-500 hover:text-slate-300 hover:border-slate-600'
                                        }`}
                                >
                                    {t(preset.labelKey)}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => { setDate(e.target.value); setActivePreset(null); }}
                                className="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none text-white transition-all"
                                required
                            />
                            <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 pointer-events-none" />
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
                    >
                        {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {showAdvanced ? t('advancedClose') : t('advancedOpen')}
                    </button>

                    {showAdvanced && (
                        <div className="space-y-3 p-4 bg-slate-900/40 rounded-xl border border-slate-700/30 animate-fade-in">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" /> {t('avgPriceLabel')}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={avgPrice}
                                    onChange={(e) => setAvgPrice(e.target.value)}
                                    placeholder={t('avgPricePlaceholder')}
                                    className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none text-white placeholder-slate-600 text-sm"
                                />
                                <p className="text-slate-600 text-xs mt-1">{t('avgPriceHint')}</p>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                                    <Hash className="w-3 h-3" /> {t('quantityLabel')}
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder={t('quantityPlaceholder')}
                                    className="w-full px-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none text-white placeholder-slate-600 text-sm"
                                />
                                <p className="text-slate-600 text-xs mt-1">{t('quantityHint')}</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleClearCache}
                                className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-rose-400 transition-colors py-2 border border-slate-700/30 rounded-lg hover:border-rose-500/30"
                            >
                                <RotateCcw className="w-3 h-3" />
                                {t('clearCache')}
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-lg rounded-xl shadow-lg shadow-cyan-500/25 transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {t('loading')}
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2 group-hover:scale-105 transition-transform">
                                {t('rideNow')}
                            </span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default InputSection;
