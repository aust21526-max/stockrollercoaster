import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Trash2, Ticket, TrendingUp, TrendingDown, Flame } from 'lucide-react';
import { getRideHistory, deleteRide, getRideStats, clearAllRides } from '../utils/rideHistory';
import RideTicket from './RideTicket';

const TicketCollection = () => {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState(null);
    const [sort, setSort] = useState('date'); // date | return | mdd

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        const data = getRideHistory();
        setHistory(data);
        setStats(getRideStats());
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to tear up this ticket?')) {
            deleteRide(id);
            loadData();
        }
    };

    const handleClearAll = () => {
        if (confirm('Warning: This will delete ALL your ride tickets. Are you sure?')) {
            clearAllRides();
            loadData();
        }
    };

    const sortedHistory = [...history].sort((a, b) => {
        if (sort === 'return') return b.returnPct - a.returnPct;
        if (sort === 'mdd') return b.mdd - a.mdd;
        return b.timestamp - a.timestamp; // default: date desc
    });

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white px-4 py-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" /> Back to Park
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <h1 className="text-2xl font-black text-amber-400 flex items-center gap-2 justify-end">
                                <Ticket className="w-6 h-6" /> Ticket Box
                            </h1>
                            <p className="text-slate-500 text-xs mt-1">
                                {history.length} rides collected
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Summary */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                            <div className="text-slate-500 text-xs uppercase font-bold mb-1">Total Rides</div>
                            <div className="text-2xl font-black text-white">{stats.totalRides}</div>
                        </div>
                        <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-500/20">
                            <div className="text-emerald-500 text-xs uppercase font-bold mb-1">Best Return</div>
                            <div className="text-2xl font-black text-emerald-400">+{stats.best.returnPct}%</div>
                            <div className="text-xs text-emerald-600 truncate">{stats.best.ticker}</div>
                        </div>
                        <div className="bg-rose-900/20 rounded-xl p-4 border border-rose-500/20">
                            <div className="text-rose-500 text-xs uppercase font-bold mb-1">Wildest Drop</div>
                            <div className="text-2xl font-black text-rose-400">-{stats.wildest.mdd}%</div>
                            <div className="text-xs text-rose-600 truncate">{stats.wildest.ticker}</div>
                        </div>
                        <div className="bg-amber-900/20 rounded-xl p-4 border border-amber-500/20">
                            <div className="text-amber-500 text-xs uppercase font-bold mb-1">Favorite</div>
                            <div className="text-2xl font-black text-amber-400">{stats.favoriteTicker?.ticker || '-'}</div>
                            <div className="text-xs text-amber-600">{stats.favoriteTicker?.count || 0} rides</div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                {history.length > 0 && (
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSort('date')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sort === 'date' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Latest
                            </button>
                            <button
                                onClick={() => setSort('return')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sort === 'return' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Best Return
                            </button>
                            <button
                                onClick={() => setSort('mdd')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sort === 'mdd' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Wildest
                            </button>
                        </div>
                        <button
                            onClick={handleClearAll}
                            className="text-rose-500 text-xs hover:text-rose-400 underline transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {history.length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl">
                        <Ticket className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-500">No tickets yet</h3>
                        <p className="text-slate-600 mt-2 mb-6">Take a ride on the stock rollercoaster to collect tickets!</p>
                        <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-slate-900 rounded-full font-bold hover:bg-amber-400 transition-all">
                            🎢 Go to Park
                        </Link>
                    </div>
                )}

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedHistory.map(ride => (
                        <RideTicket
                            key={ride.id}
                            ride={ride}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TicketCollection;
