import React, { useState, useRef, useEffect } from 'react';
import { X, Trophy, Swords } from 'lucide-react';

const NicknameModal = ({ isOpen, onClose, onSubmit, mode = 'leaderboard' }) => {
    const [name, setName] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
        if (isOpen) setName('');
    }, [isOpen]);

    if (!isOpen) return null;

    const isLeaderboard = mode === 'leaderboard';
    const icon = isLeaderboard ? <Trophy className="w-6 h-6 text-amber-400" /> : <Swords className="w-6 h-6 text-violet-400" />;
    const title = isLeaderboard ? 'Join the Leaderboard' : 'Challenge a Friend';
    const subtitle = isLeaderboard ? 'Enter your rider name to compete!' : 'Enter your name for the challenge card';
    const accentColor = isLeaderboard ? 'amber' : 'violet';
    const placeholder = isLeaderboard ? 'e.g. DiamondDave' : 'e.g. Warren B Jr';

    const handleSubmit = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        onSubmit(trimmed);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl w-full max-w-sm overflow-hidden animate-in"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'fadeInUp 0.3s ease-out' }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors p-1"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className={`px-6 pt-6 pb-4 text-center bg-${accentColor}-500/5`}>
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-${accentColor}-500/20 border border-${accentColor}-500/30 mb-3`}>
                        {icon}
                    </div>
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
                </div>

                {/* Input */}
                <div className="px-6 py-4">
                    <input
                        ref={inputRef}
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value.slice(0, 20))}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        placeholder={placeholder}
                        maxLength={20}
                        className={`w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white text-center text-lg font-bold placeholder-slate-600 focus:outline-none focus:border-${accentColor}-500/50 focus:ring-2 focus:ring-${accentColor}-500/20 transition-all`}
                    />
                    <div className="flex justify-between mt-2 px-1">
                        <span className="text-slate-600 text-xs">Max 20 characters</span>
                        <span className={`text-xs ${name.length > 15 ? `text-${accentColor}-400` : 'text-slate-600'}`}>
                            {name.length}/20
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-medium text-sm hover:bg-slate-700 hover:text-white transition-all border border-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!name.trim()}
                        className={`flex-1 py-3 bg-gradient-to-r from-${accentColor}-500 to-${accentColor}-600 text-white rounded-xl font-bold text-sm hover:from-${accentColor}-400 hover:to-${accentColor}-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-${accentColor}-500/20`}
                    >
                        {isLeaderboard ? '🏆 Submit' : '⚔️ Create Link'}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};

export default NicknameModal;
