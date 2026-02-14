import React from 'react';
import { X, Lock } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';

const BadgeModal = ({ isOpen, onClose, earnedBadges, allBadges }) => {
    const { t } = useLang();

    if (!isOpen) return null;

    // Create a Set of earned badge IDs for O(1) lookup
    const earnedSet = new Set(earnedBadges.map(b => b.id));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">{t('badgeCollectionTitle')}</h2>
                        <p className="text-slate-400 text-sm mt-1">{t('badgeCollectionDesc')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Badge Grid */}
                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {allBadges.map((badge) => {
                            const isEarned = earnedSet.has(badge.id);

                            return (
                                <div
                                    key={badge.id}
                                    className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${isEarned
                                            ? `${badge.bgColor || 'bg-slate-800'} ${badge.color.replace('text-', 'border-')}/30 shadow-lg shadow-${badge.color.replace('text-', '')}/10`
                                            : 'bg-slate-800/30 border-slate-700/50 opacity-60 grayscale'
                                        }`}
                                >
                                    {/* Locked Overlay */}
                                    {!isEarned && (
                                        <div className="absolute top-2 right-2">
                                            <Lock className="w-4 h-4 text-slate-500" />
                                        </div>
                                    )}

                                    {/* Badge Content */}
                                    <div className="flex flex-col items-center text-center gap-2">
                                        <div className={`text-4xl mb-1 ${isEarned ? 'animate-bounce-slow' : ''}`}>
                                            {badge.emoji}
                                        </div>
                                        <h3 className={`font-bold text-sm uppercase tracking-wider ${isEarned ? badge.color : 'text-slate-500'}`}>
                                            {t(badge.nameKey)}
                                        </h3>
                                        <p className="text-slate-400 text-xs leading-relaxed">
                                            {t(badge.msgKey)}
                                        </p>

                                        {/* Status Tag */}
                                        <div className={`mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isEarned ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/50 text-slate-500'
                                            }`}>
                                            {isEarned ? t('badgeEarned') : t('badgeLocked')}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer progress */}
                <div className="p-4 bg-slate-800/30 border-t border-slate-700/50 flex justify-center">
                    <p className="text-slate-400 text-sm font-mono">
                        {t('badgeEarned')}: <span className="text-white font-bold">{earnedBadges.length}</span> / {allBadges.length}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BadgeModal;
