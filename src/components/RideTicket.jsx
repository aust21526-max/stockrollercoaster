import React from 'react';
import { Trash2, AlertTriangle, ArrowRight, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';

const RideTicket = ({ ride, onDelete }) => {
    const { id, ticker, startDate, endDate, returnPct, mdd, grade, emoji, badges, timestamp } = ride;

    // Format dates
    const startStr = new Date(startDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const endStr = new Date(endDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const rodeDate = new Date(timestamp).toLocaleDateString();

    const isProfit = returnPct >= 0;

    // Gradient based on grade/result
    let bgGradient = 'from-slate-800 to-slate-900';
    let borderColor = 'border-slate-700';

    if (returnPct >= 100) { bgGradient = 'from-amber-900/40 to-yellow-900/40'; borderColor = 'border-amber-500/30'; }
    else if (returnPct >= 20) { bgGradient = 'from-emerald-900/40 to-teal-900/40'; borderColor = 'border-emerald-500/30'; }
    else if (returnPct <= -50) { bgGradient = 'from-rose-900/40 to-red-900/40'; borderColor = 'border-rose-500/30'; }

    const handleShare = async () => {
        const node = document.getElementById(`ticket-${id}`);
        if (!node) return;
        try {
            const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 });
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], 'ride-ticket.png', { type: 'image/png' });
            if (navigator.share) {
                await navigator.share({
                    files: [file],
                    title: `My ${ticker} Ride Ticket`,
                    text: `I survived the ${ticker} rollercoaster with ${returnPct}% return! 🎢`
                });
            } else {
                const link = document.createElement('a');
                link.download = `ticket-${ticker}.png`;
                link.href = dataUrl;
                link.click();
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="group relative transition-all hover:-translate-y-1 hover:shadow-xl">
            {/* Delete button (visible on hover) */}
            {onDelete && (
                <button
                    onClick={() => onDelete(id)}
                    className="absolute -top-2 -right-2 z-10 p-1.5 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    title="Delete ticket"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}

            <div
                id={`ticket-${id}`}
                className={`relative overflow-hidden bg-gradient-to-br ${bgGradient} border ${borderColor} rounded-xl shadow-lg`}
            >
                {/* Perforated edge effect (left/right circles) */}
                <div className="absolute top-1/2 -left-3 w-6 h-6 bg-[#0f172a] rounded-full sm:bg-slate-950" />
                <div className="absolute top-1/2 -right-3 w-6 h-6 bg-[#0f172a] rounded-full sm:bg-slate-950" />

                <div className="p-5 flex flex-col h-full relative">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tight">{ticker}</h3>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mt-0.5">
                                <span>{startStr}</span>
                                <ArrowRight className="w-3 h-3" />
                                <span>{endStr}</span>
                            </div>
                        </div>
                        <div className="text-4xl filter drop-shadow-md transform group-hover:scale-110 transition-transform cursor-default" title={grade}>
                            {emoji}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className={`p-2 rounded-lg bg-black/20 border border-white/5 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Return</div>
                            <div className="text-xl font-black">{returnPct > 0 ? '+' : ''}{returnPct}%</div>
                        </div>
                        <div className="p-2 rounded-lg bg-black/20 border border-white/5 text-amber-400">
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-0.5">Max Drop</div>
                            <div className="text-xl font-black">-{mdd}%</div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-3 border-t border-white/10 flex justify-between items-end">
                        <div className="flex gap-1">
                            {badges && badges.slice(0, 3).map((b, i) => (
                                <span key={i} className="text-lg" title="Badge earned">{b}</span>
                            ))}
                        </div>
                        <div className="text-[10px] text-slate-600 font-mono text-right">
                            ADMIT ONE<br />
                            {rodeDate}
                        </div>

                        {/* Share Button (screen only) */}
                        <button
                            onClick={handleShare}
                            className="absolute bottom-3 right-3 p-1.5 text-slate-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <Share2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Watermark/Texture overlay */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
                    <div className="absolute -bottom-6 -right-6 text-9xl opacity-5 pointer-events-none select-none font-black text-white">
                        {ticker[0]}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RideTicket;
