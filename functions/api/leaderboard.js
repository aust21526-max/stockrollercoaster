// Cloudflare Pages Function: GET & POST /api/leaderboard
// Uses KV namespace "LEADERBOARD" bound in wrangler.toml / Cloudflare dashboard

const SEED_DATA = [
    { nickname: 'DiamondDave', ticker: 'TSLA', returnPct: 342.5, mdd: 68.2, grade: 'S', emoji: '🎢', date: '2020-03-16' },
    { nickname: 'BuyHighSellLow', ticker: 'GME', returnPct: -85.3, mdd: 92.1, grade: 'F', emoji: '🍂', date: '2021-01-28' },
    { nickname: 'WarrenB_Jr', ticker: 'AAPL', returnPct: 156.8, mdd: 22.4, grade: 'B', emoji: '🌊', date: '2019-06-01' },
    { nickname: 'CryptoKing99', ticker: 'COIN', returnPct: -67.2, mdd: 78.5, grade: 'D-', emoji: '🔥', date: '2021-11-09' },
    { nickname: 'HODLqueen', ticker: 'NVDA', returnPct: 890.2, mdd: 45.3, grade: 'S', emoji: '🎢', date: '2020-01-02' },
    { nickname: 'PaperBoy', ticker: 'META', returnPct: -12.5, mdd: 15.8, grade: 'B', emoji: '🎠', date: '2023-10-15' },
    { nickname: 'YOLOmaster', ticker: 'AMC', returnPct: 1200.0, mdd: 88.5, grade: 'GOD', emoji: '🚀', date: '2021-01-13' },
    { nickname: 'SafeHaven', ticker: 'MSFT', returnPct: 42.1, mdd: 18.3, grade: 'B', emoji: '🌊', date: '2022-06-01' },
    { nickname: 'DipBuyer', ticker: 'AMZN', returnPct: 78.9, mdd: 38.7, grade: 'A', emoji: '🗼', date: '2022-01-03' },
    { nickname: 'RocketRider', ticker: 'PLTR', returnPct: 245.6, mdd: 55.2, grade: 'A+', emoji: '🕳️', date: '2023-01-01' },
    { nickname: 'ZenMaster', ticker: 'GOOGL', returnPct: 67.3, mdd: 28.9, grade: 'A', emoji: '🗼', date: '2021-07-15' },
    { nickname: 'MoonShot', ticker: 'SMCI', returnPct: 520.4, mdd: 72.1, grade: 'S', emoji: '🎢', date: '2023-06-01' },
    { nickname: 'SteadyEddy', ticker: 'JNJ', returnPct: 8.2, mdd: 12.1, grade: 'B', emoji: '🎠', date: '2023-01-01' },
    { nickname: 'FearIndex', ticker: 'VIX', returnPct: -45.6, mdd: 61.3, grade: 'D-', emoji: '🔥', date: '2023-03-01' },
    { nickname: 'LongGame', ticker: 'BRK.B', returnPct: 95.4, mdd: 19.8, grade: 'B', emoji: '🌊', date: '2020-06-01' },
];

function getTodayKey() {
    const now = new Date();
    return `leaderboard-${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

async function getOrInitLeaderboard(env) {
    const key = getTodayKey();
    const raw = await env.LEADERBOARD.get(key);

    if (raw) {
        return JSON.parse(raw);
    }

    // First request of the day → seed data
    const seeded = SEED_DATA.map((entry, i) => ({
        ...entry,
        id: `seed-${i}`,
        timestamp: Date.now() - (i * 60000), // Stagger timestamps
    }));

    await env.LEADERBOARD.put(key, JSON.stringify(seeded), {
        expirationTtl: 86400 * 2, // Auto-expire after 2 days
    });

    return seeded;
}

export async function onRequestGet(context) {
    const { env } = context;

    try {
        const entries = await getOrInitLeaderboard(env);

        // Sort into categories
        const rideEntries = entries.filter(e => !e.isChallenge);
        const challengeEntries = entries.filter(e => e.isChallenge);

        const thrilling = [...rideEntries].sort((a, b) => b.mdd - a.mdd).slice(0, 20);
        const best = [...rideEntries].sort((a, b) => b.returnPct - a.returnPct).slice(0, 20);
        const worst = [...rideEntries].sort((a, b) => a.returnPct - b.returnPct).slice(0, 20);

        // Mystery Challenge: sort by most correct answers (returnPct = correctCount)
        const mystery = [...challengeEntries].sort((a, b) => b.returnPct - a.returnPct || b.mdd - a.mdd).slice(0, 20);

        return new Response(JSON.stringify({
            date: getTodayKey(),
            total: entries.length,
            thrilling,
            best,
            worst,
            mystery,
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=30', // 30s cache
            },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;

    try {
        const body = await request.json();
        const { nickname, ticker, returnPct, mdd, grade, emoji, startDate } = body;

        // Validation
        if (!nickname || !ticker || returnPct === undefined || mdd === undefined) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        // Sanitize nickname (max 20 chars, no HTML)
        const cleanNickname = String(nickname).replace(/<[^>]*>/g, '').trim().slice(0, 20);

        const entries = await getOrInitLeaderboard(env);

        // Cap at 200 entries per day
        if (entries.length >= 200) {
            return new Response(JSON.stringify({ error: 'Leaderboard is full for today!' }), {
                status: 429,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        const newEntry = {
            id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            nickname: cleanNickname,
            ticker: String(ticker).toUpperCase().slice(0, 10),
            returnPct: parseFloat(Number(returnPct).toFixed(1)),
            mdd: parseFloat(Number(mdd).toFixed(1)),
            grade: String(grade).slice(0, 10),
            emoji: String(emoji || '🎢').slice(0, 4),
            date: String(startDate || '').slice(0, 10),
            timestamp: Date.now(),
            isChallenge: !!body.isChallenge,
        };

        entries.push(newEntry);

        const key = getTodayKey();
        await env.LEADERBOARD.put(key, JSON.stringify(entries), {
            expirationTtl: 86400 * 2,
        });

        return new Response(JSON.stringify({ success: true, entry: newEntry, rank: entries.length }), {
            status: 201,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
