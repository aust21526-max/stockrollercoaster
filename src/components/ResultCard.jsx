import React, { useRef, useState, useMemo } from 'react';
import { toPng } from 'html-to-image';
import { Share2, Download, TrendingDown, Clock, Award, Flame, Zap, BookOpen, Copy, Swords, Trophy } from 'lucide-react';
import { calculateMaxDrawdown, getRideGrade, formatDuration, getFactBomb, detectEvents, calculateSurvivalRate, getBadges, ALL_BADGES } from '../utils/analysis';
import { saveRide } from '../utils/rideHistory';
import { useLang } from '../i18n/LanguageContext';
import { Link } from 'react-router-dom';
import BadgeModal from './BadgeModal';
import NicknameModal from './NicknameModal';

const ResultCard = ({ ticker, data, chartNode, avgPrice, quantity, comparisonTicker, comparisonData, battleInfo }) => {
    const { lang, t } = useLang();
    const cardRef = useRef(null);
    const [capturing, setCapturing] = useState(false);
    const [showBadgeModal, setShowBadgeModal] = useState(false);
    const [xCopied, setXCopied] = useState(false);
    const [leaderboardStatus, setLeaderboardStatus] = useState(null);
    const [showNicknameModal, setShowNicknameModal] = useState(false);
    const [nicknameMode, setNicknameMode] = useState('leaderboard'); // 'leaderboard' | 'challenge'

    const [savedRideId, setSavedRideId] = useState(null);

    // Save ride to history on mount
    useEffect(() => {
        if (data && data.length > 0 && !battleInfo) {
            const ride = saveRide({
                ticker,
                startDate: data[0].date,
                endDate: data[data.length - 1].date,
                returnPct: ((data[data.length - 1].close - (avgPrice || data[0].close)) / (avgPrice || data[0].close) * 100),
                mdd: calculateMaxDrawdown(data).maxDrawdown * 100,
                grade: getRideGrade(calculateMaxDrawdown(data).maxDrawdown, ((data[data.length - 1].close - (avgPrice || data[0].close)) / (avgPrice || data[0].close) * 100)).grade,
                emoji: getRideGrade(calculateMaxDrawdown(data).maxDrawdown, ((data[data.length - 1].close - (avgPrice || data[0].close)) / (avgPrice || data[0].close) * 100)).emoji,
                badges: getBadges(((data[data.length - 1].close - (avgPrice || data[0].close)) / (avgPrice || data[0].close) * 100), calculateMaxDrawdown(data).maxDrawdown, Math.ceil((new Date(data[data.length - 1].date) - new Date(data[0].date)) / 86400000)),
                durationDays: Math.ceil((new Date(data[data.length - 1].date) - new Date(data[0].date)) / 86400000)
            });
            if (ride) setSavedRideId(ride.id);
        }
    }, [data, ticker]);

    if (!data || data.length === 0) return null;

    // 1. Basic Price & Return
    const initialPrice = avgPrice || data[0].close;
    const currentPrice = data[data.length - 1].close;
    const totalReturn = ((currentPrice - initialPrice) / initialPrice) * 100;
    const isProfit = totalReturn >= 0;

    // 2. Volatility & Stats
    const { maxDrawdown } = useMemo(() => calculateMaxDrawdown(data), [data]);
    const maxGForce = (maxDrawdown * 10).toFixed(1);
    const mddPercent = (maxDrawdown * 100).toFixed(1);

    // 3. Advanced Analysis (Grade & Badges)
    // Pass both maxDrawdown and totalReturn to getRideGrade for new Complex Logic
    const rideGrade = useMemo(() => getRideGrade(maxDrawdown, totalReturn), [maxDrawdown, totalReturn]);

    const startDate = new Date(data[0].date);
    const endDate = new Date(data[data.length - 1].date);
    const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    const badges = useMemo(() => getBadges(totalReturn, maxDrawdown, durationDays), [totalReturn, maxDrawdown, durationDays]);
    const survivalRate = useMemo(() => calculateSurvivalRate(data, initialPrice), [data, initialPrice]);
    const events = useMemo(() => detectEvents(data), [data]);

    const actualPnL = quantity ? (currentPrice - initialPrice) * quantity : null;
    const investmentTotal = quantity ? initialPrice * quantity : null;

    const factBombs = useMemo(() => getFactBomb(totalReturn, maxDrawdown, durationDays, t), [totalReturn, maxDrawdown, durationDays, t]);
    const dropCount = events.filter(e => e.type === 'drop').length;
    const loopCount = events.filter(e => e.type === 'loop').length;

    const [challengeCopied, setChallengeCopied] = useState(false);

    const handleShare = async () => {
        if (cardRef.current === null) return;
        setCapturing(true);
        try {
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
            const link = document.createElement('a');
            link.download = `${ticker}-rollercoaster-ticket.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to capture image', err);
        } finally {
            setCapturing(false);
        }
    };

    const handleChallengeFriend = () => {
        setNicknameMode('challenge');
        setShowNicknameModal(true);
    };

    const handleChallengeSubmit = (name) => {
        const url = new URL(window.location.href);
        const baseUrl = url.origin + url.pathname;
        const battleUrl = `${baseUrl}?c_name=${encodeURIComponent(name)}&c_ticker=${ticker}&c_return=${totalReturn.toFixed(2)}`;
        navigator.clipboard.writeText(battleUrl).then(() => {
            setChallengeCopied(true);
            setTimeout(() => setChallengeCopied(false), 2000);
        });
    };

    const handleLeaderboardSubmit = async (nickname) => {
        setLeaderboardStatus('submitting');
        try {
            const res = await fetch('/api/leaderboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nickname,
                    ticker,
                    returnPct: parseFloat(totalReturn.toFixed(1)),
                    mdd: parseFloat(mddPercent),
                    grade: rideGrade.grade,
                    emoji: rideGrade.emoji,
                    startDate: data[0].date,
                }),
            });
            if (!res.ok) throw new Error('Failed');
            setLeaderboardStatus('success');
        } catch {
            setLeaderboardStatus('error');
            setTimeout(() => setLeaderboardStatus(null), 3000);
        }
    };

    const getShareText = () => {
        const emoji = isProfit ? '🚀' : '💀';
        const sign = totalReturn >= 0 ? '+' : '';
        const gradeName = t(rideGrade.nameKey) || rideGrade.grade;
        return `${emoji} I rode the ${ticker} Stock Rollercoaster!\nReturn: ${sign}${totalReturn.toFixed(1)}%\nRide Grade: ${rideGrade.emoji} ${gradeName}\nMDD: -${mddPercent}%\n\nTry yours 🎢👉`;
    };

    const getShareUrl = () => {
        return window.location.origin + window.location.pathname;
    };

    const handleShareX = async () => {
        if (cardRef.current === null) return;
        setXCopied(false);

        try {
            // 1. Generate the ticket image
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });

            // 2. Copy image to clipboard
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);

            setXCopied(true);
            setTimeout(() => setXCopied(false), 5000);

            // 3. Open X compose window
            const text = getShareText();
            const url = getShareUrl();
            const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
            window.open(xUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
        } catch (err) {
            console.error('Failed to copy image for X share:', err);
            // Fallback: just open X without image
            const text = getShareText();
            const url = getShareUrl();
            const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
            window.open(xUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
        }
    };

    const dateLocale = lang === 'ko' ? 'ko-KR' : 'en-US';

    return (
        <div className="w-full max-w-4xl mx-auto mt-4 px-4">
            <div
                ref={cardRef}
                className="bg-slate-900 rounded-3xl relative overflow-hidden shadow-2xl border-x-4 border-slate-800"
                style={{
                    backgroundImage: 'radial-gradient(circle at 0% 50%, transparent 15px, #0f172a 16px), radial-gradient(circle at 100% 50%, transparent 15px, #0f172a 16px)',
                    backgroundSize: '100% 100%',
                    backgroundPosition: '0 0, 0 0'
                }}
            >
                {/* Visual Effects */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                {/* Ticket Stub Header */}
                <div className="relative z-10 p-6 md:p-8 border-b-2 border-dashed border-slate-700/50 flex justify-between items-center bg-slate-800/30">
                    <div>
                        <p className="text-slate-500 text-xs font-bold tracking-[0.2em] uppercase mb-1">{t('ticketAdmitOne')}</p>
                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                            {ticker} <span className="text-cyan-400">RIDE</span>
                        </h2>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-500 text-xs font-mono mb-1">{t('ticketNumber')}</p>
                        <div className={`px-4 py-2 rounded-lg font-black text-xl md:text-2xl border ${isProfit ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                            {totalReturn > 0 ? '+' : ''}{totalReturn.toFixed(2)}%
                        </div>
                    </div>
                </div>

                {/* Viral Badges Overlay */}
                <div className="absolute top-24 right-6 z-20 flex flex-col gap-3 rotate-6 pointer-events-none opacity-90">
                    {badges.map(badge => (
                        <div key={badge.id} className={`border-4 border-double ${badge.color.replace('text-', 'border-')} p-2 rounded-lg bg-slate-900/90 backdrop-blur-sm text-center shadow-lg transform hover:scale-110 transition-transform duration-300`}>
                            <div className="text-2xl animate-bounce">{badge.emoji}</div>
                            <div className={`text-[10px] font-black uppercase tracking-wider ${badge.color}`}>{t(badge.nameKey)}</div>
                        </div>
                    ))}
                </div>

                {/* Battle Result Overlay */}
                {battleInfo && (
                    <div className="absolute top-24 left-6 z-20 -rotate-6 pointer-events-none opacity-90">
                        <div className={`border-4 border-double ${totalReturn >= battleInfo.returnRate ? 'border-emerald-400 bg-emerald-900/90 text-emerald-400' : 'border-rose-400 bg-rose-900/90 text-rose-400'} p-4 rounded-lg backdrop-blur-sm text-center shadow-xl animate-bounce-in`}>
                            <div className="text-4xl mb-1">{totalReturn >= battleInfo.returnRate ? '🏆' : '💀'}</div>
                            <div className="text-xl font-black uppercase tracking-wider">{totalReturn >= battleInfo.returnRate ? 'WINNER' : 'DEFEATED'}</div>
                            <div className="text-[10px] font-bold mt-1">vs {battleInfo.name}</div>
                        </div>
                    </div>
                )}

                <div className="relative z-10 p-6 md:p-8">
                    {/* Ride Grade */}
                    <div className={`${rideGrade.bgColor} border ${rideGrade.color.replace('text-', 'border-')}/20 rounded-xl p-4 mb-6 flex items-center gap-4`}>
                        <span className="text-4xl">{rideGrade.emoji}</span>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`text-2xl font-black ${rideGrade.color}`}>{rideGrade.grade}</span>
                                <span className="text-slate-300 font-bold text-lg">{t(rideGrade.nameKey)}</span>
                            </div>
                            <p className="text-slate-400 text-sm mt-0.5">{t(rideGrade.descKey)}</p>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="mb-6">
                        {chartNode}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30">
                            <div className="flex items-center gap-1.5 mb-2">
                                <TrendingDown className="w-4 h-4 text-rose-400" />
                                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{t('maxGForce')}</p>
                            </div>
                            <span className="text-2xl font-black text-white">{maxGForce}G</span>
                            <p className="text-rose-400 text-xs font-bold mt-0.5">MDD -{mddPercent}%</p>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Clock className="w-4 h-4 text-cyan-400" />
                                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{t('rideDuration')}</p>
                            </div>
                            <span className="text-2xl font-black text-white">{formatDuration(durationDays, lang)}</span>
                            <p className="text-slate-500 text-xs mt-0.5">{startDate.getFullYear()}.{startDate.getMonth() + 1} - {endDate.getFullYear()}.{endDate.getMonth() + 1}</p>
                        </div>
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Flame className="w-4 h-4 text-orange-400" />
                                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{t('dropCount')}</p>
                            </div>
                            <span className="text-2xl font-black text-white">{dropCount}</span>
                            <p className="text-rose-400 text-xs mt-0.5">{t('dropDesc')}</p>
                        </div>
                        {/* Survival Rate (Feature 9) */}
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/30">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Zap className="w-4 h-4 text-yellow-400" />
                                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{t('survivalRate')}</p>
                            </div>
                            <span className="text-2xl font-black text-white">{survivalRate.toFixed(1)}%</span>
                            <p className="text-slate-500 text-xs mt-0.5">{t('survivalDesc').substring(0, 15)}...</p>
                        </div>
                    </div>

                    {/* Actual P&L */}
                    {actualPnL !== null && (
                        <div className={`mt-4 p-4 rounded-xl border ${isProfit ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">{t('investmentPerformance')}</p>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-slate-500 text-xs mb-1">{t('investmentAmount')}</p>
                                    <p className="text-white font-bold text-lg">${investmentTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs mb-1">{t('currentValue')}</p>
                                    <p className="text-white font-bold text-lg">${(currentPrice * quantity).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs mb-1">{t('pnl')}</p>
                                    <p className={`font-black text-lg ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {actualPnL >= 0 ? '+' : ''}${actualPnL.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Barcode Footer */}
                    <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-700/50">
                        <div className="h-12 w-full bg-slate-800 opacity-50 flex items-center justify-center p-1">
                            {/* CSS Barcode Mock */}
                            <div className="w-full h-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent 0%, transparent 5%, #000 5%, #000 10%, transparent 10%, transparent 15%, #000 15%, #000 25%, transparent 25%, transparent 30%, #000 30%, #000 45%, transparent 45%, transparent 50%, #000 50%, #000 60%, transparent 60%, transparent 70%, #000 70%, #000 80%, transparent 80%, transparent 90%, #000 90%, #000 100%)', backgroundSize: '20px 100%' }}></div>
                        </div>
                        <p className="text-center text-slate-500 text-[10px] font-bold mt-2 uppercase tracking-widest">{t('watermarkText')}</p>
                        <div className="flex justify-between items-center text-slate-600 text-[10px] mt-1 font-mono">
                            <p>STOCK-VOLATILITY-ROLLERCOASTER-V1.2</p>
                            <p>{new Date().toLocaleDateString(dateLocale)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col md:flex-row justify-center gap-4 mt-6 flex-wrap">
                <button
                    onClick={handleShare}
                    className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full font-bold text-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
                >
                    {capturing ? <Download className="w-5 h-5 animate-bounce" /> : <Share2 className="w-5 h-5" />}
                    {capturing ? t('capturing') : t('shareButton')}
                </button>

                <button
                    onClick={handleChallengeFriend}
                    className="flex items-center justify-center gap-3 px-8 py-4 bg-violet-600 text-white rounded-full font-bold text-lg hover:bg-violet-500 transition-all shadow-lg shadow-violet-500/20 active:scale-95"
                >
                    {challengeCopied ? <span className="animate-pulse">{t('battleLinkCopied')}</span> : (
                        <>
                            <Swords className="w-5 h-5" />
                            {t('battleChallengeFriend')}
                        </>
                    )}
                </button>

                <button
                    onClick={handleShareX}
                    className="flex items-center justify-center gap-3 px-8 py-4 bg-black text-white rounded-full font-bold text-lg hover:bg-zinc-800 transition-all shadow-lg shadow-black/20 border border-zinc-700 active:scale-95"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    {xCopied ? '✅ Image copied! Paste in X' : 'Share on X'}
                </button>
            </div>

            {/* Secondary Actions */}
            <div className="flex justify-center gap-3 mt-3 flex-wrap">
                <button
                    onClick={() => setShowBadgeModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 text-slate-400 rounded-full text-xs font-medium hover:bg-slate-700 hover:text-white transition-all border border-slate-700/50"
                >
                    <BookOpen className="w-3.5 h-3.5" />
                    {t('badgeCollection')}
                </button>

                <Link
                    to="/collection"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 text-cyan-400 rounded-full text-xs font-medium hover:bg-slate-700 hover:text-cyan-300 transition-all border border-slate-700/50"
                >
                    <BookOpen className="w-3.5 h-3.5" />
                    View Ticket
                </Link>

                <button
                    onClick={() => {
                        if (leaderboardStatus === 'success') return;
                        setNicknameMode('leaderboard');
                        setShowNicknameModal(true);
                    }}
                    disabled={leaderboardStatus === 'submitting'}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all border ${leaderboardStatus === 'success'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                        : leaderboardStatus === 'error'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                        }`}
                >
                    <Trophy className="w-3.5 h-3.5" />
                    {leaderboardStatus === 'submitting' ? 'Submitting...' :
                        leaderboardStatus === 'success' ? '✅ Submitted!' :
                            leaderboardStatus === 'error' ? '❌ Failed' :
                                '🏆 Join Leaderboard'}
                </button>
            </div>

            {/* Badge Modal */}
            <BadgeModal
                isOpen={showBadgeModal}
                onClose={() => setShowBadgeModal(false)}
                earnedBadges={badges}
                allBadges={ALL_BADGES}
            />

            {/* Nickname Modal */}
            <NicknameModal
                isOpen={showNicknameModal}
                onClose={() => setShowNicknameModal(false)}
                mode={nicknameMode}
                onSubmit={(name) => {
                    if (nicknameMode === 'challenge') {
                        handleChallengeSubmit(name);
                    } else {
                        handleLeaderboardSubmit(name);
                    }
                }}
            />
        </div>
    );
};

export default ResultCard;
