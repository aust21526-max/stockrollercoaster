import React from 'react';
import { ExternalLink, X, TrendingDown, TrendingUp, Mountain, CircleDot } from 'lucide-react';
import { getKnownEvent, getEventContext } from '../utils/stockEvents';

const EventInfoPanel = ({ event, ticker, onClose }) => {
    if (!event) return null;

    const { type, date, change, close } = event;
    const knownEvent = getKnownEvent(ticker, date);
    const contextDesc = getEventContext(type, change || 0, close || 0);

    const typeConfig = {
        drop: { label: 'Price Drop', emoji: '😱', color: 'rose', icon: TrendingDown, sign: '' },
        loop: { label: 'Price Surge', emoji: '🚀', color: 'emerald', icon: TrendingUp, sign: '+' },
        peak: { label: 'All-Time High', emoji: '🏔️', color: 'amber', icon: Mountain, sign: '' },
        trough: { label: 'Rock Bottom', emoji: '🕳️', color: 'rose', icon: CircleDot, sign: '' },
        start: { label: 'Ride Start', emoji: '🎫', color: 'cyan', icon: CircleDot, sign: '' },
        end: { label: 'Ride End', emoji: '🏁', color: 'cyan', icon: CircleDot, sign: '' },
    };

    const config = typeConfig[type] || typeConfig.start;
    const Icon = config.icon;
    const formattedDate = new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(ticker)}+stock+news+${date}&tbm=nws`;

    return (
        <div className="relative mt-4 bg-gradient-to-r from-slate-800/80 to-slate-900/80 rounded-xl border border-slate-700/50 overflow-hidden"
            style={{ animation: 'slideUp 0.25s ease-out' }}
        >
            {/* Accent bar */}
            <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-${config.color}-500 to-${config.color}-400`} />

            <div className="px-4 py-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl flex-shrink-0">{config.emoji}</span>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-bold text-${config.color}-400 text-sm`}>{config.label}</span>
                                <span className="text-slate-500 text-xs font-mono">{formattedDate}</span>
                                {change && (
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${change >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                        }`}>
                                        {config.sign}{change.toFixed(1)}%
                                    </span>
                                )}
                                {close && (
                                    <span className="text-slate-500 text-xs">${close.toFixed(2)}</span>
                                )}
                            </div>

                            {/* Known event headline */}
                            {knownEvent && (
                                <div className="mt-1.5">
                                    <p className={`font-bold text-${config.color}-300 text-sm`}>{knownEvent.headline}</p>
                                    <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{knownEvent.desc}</p>
                                </div>
                            )}

                            {/* Context description */}
                            {!knownEvent && contextDesc && (
                                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{contextDesc}</p>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-white transition-colors p-1 flex-shrink-0"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                    <a
                        href={searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-${config.color}-500/10 border border-${config.color}-500/30 rounded-lg text-${config.color}-400 text-xs font-semibold hover:bg-${config.color}-500/20 transition-all`}
                    >
                        <ExternalLink className="w-3 h-3" />
                        Search News for {date}
                    </a>
                    <a
                        href={`https://finance.yahoo.com/quote/${ticker}/history?period1=${Math.floor(new Date(new Date(date).getTime() - 7 * 86400000).getTime() / 1000)}&period2=${Math.floor(new Date(new Date(date).getTime() + 7 * 86400000).getTime() / 1000)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-400 text-xs font-semibold hover:bg-slate-700 hover:text-white transition-all"
                    >
                        📊 View on Yahoo Finance
                    </a>
                </div>
            </div>

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default EventInfoPanel;
