/**
 * Ride History — localStorage persistence for ride ticket collection
 */

const STORAGE_KEY = 'ride-history';
const MAX_RIDES = 100;

export function getRideHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function saveRide({ ticker, startDate, endDate, returnPct, mdd, grade, emoji, badges, durationDays }) {
    const history = getRideHistory();

    // Prevent duplicate saves for same ticker+startDate within 1 minute
    const recentDupe = history.find(r =>
        r.ticker === ticker && r.startDate === startDate &&
        Date.now() - r.timestamp < 60000
    );
    if (recentDupe) return recentDupe;

    const ride = {
        id: `ride-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ticker: ticker.toUpperCase(),
        startDate,
        endDate,
        returnPct: parseFloat(Number(returnPct).toFixed(1)),
        mdd: parseFloat(Number(mdd).toFixed(1)),
        grade: String(grade),
        emoji: String(emoji),
        badges: (badges || []).slice(0, 5).map(b => b.emoji || b),
        durationDays: Number(durationDays) || 0,
        timestamp: Date.now(),
    };

    history.unshift(ride); // newest first

    // Cap at MAX_RIDES
    if (history.length > MAX_RIDES) history.length = MAX_RIDES;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return ride;
}

export function deleteRide(id) {
    const history = getRideHistory().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return history;
}

export function clearAllRides() {
    localStorage.removeItem(STORAGE_KEY);
}

export function getRideStats() {
    const history = getRideHistory();
    if (history.length === 0) return null;

    const totalRides = history.length;
    const best = history.reduce((a, b) => a.returnPct > b.returnPct ? a : b);
    const worst = history.reduce((a, b) => a.returnPct < b.returnPct ? a : b);
    const wildest = history.reduce((a, b) => a.mdd > b.mdd ? a : b);
    const avgReturn = history.reduce((sum, r) => sum + r.returnPct, 0) / totalRides;

    // Most ridden ticker
    const tickerCounts = {};
    history.forEach(r => { tickerCounts[r.ticker] = (tickerCounts[r.ticker] || 0) + 1; });
    const favoriteTicker = Object.entries(tickerCounts).sort((a, b) => b[1] - a[1])[0];

    return {
        totalRides,
        best,
        worst,
        wildest,
        avgReturn: parseFloat(avgReturn.toFixed(1)),
        favoriteTicker: favoriteTicker ? { ticker: favoriteTicker[0], count: favoriteTicker[1] } : null,
    };
}
