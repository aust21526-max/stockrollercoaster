import { useState, useCallback } from 'react';

// ═══════════════════════════════════════════
// PRIMARY: Twelve Data API (800 req/day free)
// ═══════════════════════════════════════════
const TD_API_KEYS = [
    'b72294ade9554b9d81e5074a5a0c52a2', // Key 1
    '0b6bda73abdb4b6d9b90a74189fdcbb7', // Key 2
    '300a4be26d10484aba6c202b4c9f7635'  // Key 3
];

const getRandomTDKey = () => TD_API_KEYS[Math.floor(Math.random() * TD_API_KEYS.length)];

// ═══════════════════════════════════════════
// FALLBACK: Yahoo Finance (via CORS proxy)
// ═══════════════════════════════════════════
const CORS_PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
];

async function fetchFromYahoo(ticker, startDate, endDate) {
    const period1 = Math.floor(new Date(startDate).getTime() / 1000);
    const period2 = Math.floor(new Date(endDate).getTime() / 1000);
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false`;

    let lastError = null;

    for (const proxy of CORS_PROXIES) {
        try {
            const proxyUrl = proxy + encodeURIComponent(yahooUrl);
            console.log(`[Yahoo Fallback] Trying proxy: ${proxy.slice(0, 30)}...`);

            const response = await fetch(proxyUrl, {
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.chart?.error) {
                throw new Error(data.chart.error.description || 'Yahoo API error');
            }

            const result = data.chart?.result?.[0];
            if (!result || !result.timestamp) {
                throw new Error('No data from Yahoo Finance');
            }

            // Transform Yahoo format → our format
            const timestamps = result.timestamp;
            const quotes = result.indicators?.quote?.[0];
            if (!quotes) throw new Error('No quote data');

            const values = timestamps.map((ts, i) => {
                const close = quotes.close?.[i];
                const open = quotes.open?.[i];
                const high = quotes.high?.[i];
                const low = quotes.low?.[i];

                if (close == null) return null;

                return {
                    date: new Date(ts * 1000).toISOString().split('T')[0],
                    close: parseFloat(close.toFixed(4)),
                    open: open ? parseFloat(open.toFixed(4)) : close,
                    high: high ? parseFloat(high.toFixed(4)) : close,
                    low: low ? parseFloat(low.toFixed(4)) : close,
                };
            }).filter(Boolean);

            if (values.length === 0) {
                throw new Error('No valid price data from Yahoo');
            }

            console.log(`[Yahoo Fallback] Success! Got ${values.length} data points`);

            return {
                meta: {
                    symbol: ticker,
                    source: 'Yahoo Finance (fallback)',
                },
                values
            };
        } catch (err) {
            console.warn(`[Yahoo Fallback] Proxy failed:`, err.message);
            lastError = err;
        }
    }

    throw new Error(`Yahoo Finance fallback also failed: ${lastError?.message}`);
}

// ═══════════════════════════════════════════
// Rate limit detection
// ═══════════════════════════════════════════
function isTDRateLimited(data) {
    if (data.status === 'error') {
        const msg = (data.message || '').toLowerCase();
        return msg.includes('api key') ||
            msg.includes('rate limit') ||
            msg.includes('exceeded') ||
            msg.includes('minute') ||
            msg.includes('quota') ||
            msg.includes('too many') ||
            data.code === 429;
    }
    return false;
}

// ═══════════════════════════════════════════
// Main Hook
// ═══════════════════════════════════════════
export const useStockData = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [stockData, setStockData] = useState([]);
    const [comparisonData, setComparisonData] = useState(null);
    const [metaData, setMetaData] = useState(null);

    const fetchTickerData = async (ticker, startDate, endDate) => {
        const cacheKey = `rollercoaster-${ticker}-${startDate}-${endDate}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
            console.log('Using cached data for', ticker);
            return JSON.parse(cached);
        }

        // ── Try Twelve Data first ──
        console.log('[TwelveData] Fetching data for', ticker);
        const apiKey = getRandomTDKey();
        const url = `https://api.twelvedata.com/time_series?symbol=${ticker}&interval=1day&start_date=${startDate}&end_date=${endDate}&outputsize=5000&apikey=${apiKey}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            // Check for rate limit → trigger Yahoo fallback
            if (isTDRateLimited(data)) {
                console.warn('[TwelveData] Rate limited! Switching to Yahoo Finance...');
                const yahooResult = await fetchFromYahoo(ticker, startDate, endDate);
                localStorage.setItem(cacheKey, JSON.stringify(yahooResult));
                return yahooResult;
            }

            if (data.status === 'error') {
                throw new Error(data.message || `Failed to fetch data for ${ticker}`);
            }

            if (!data.values || data.values.length === 0) {
                throw new Error(`No data found for ${ticker}`);
            }

            // Process TwelveData format
            const sortedValues = data.values.map(v => ({
                date: v.datetime,
                close: parseFloat(v.close),
                open: parseFloat(v.open),
                high: parseFloat(v.high),
                low: parseFloat(v.low),
            })).reverse();

            const result = {
                meta: data.meta,
                values: sortedValues
            };

            localStorage.setItem(cacheKey, JSON.stringify(result));
            return result;

        } catch (err) {
            // If TD fails completely (network error, etc), try Yahoo
            console.warn('[TwelveData] Failed:', err.message, '→ Trying Yahoo...');
            try {
                const yahooResult = await fetchFromYahoo(ticker, startDate, endDate);
                localStorage.setItem(cacheKey, JSON.stringify(yahooResult));
                return yahooResult;
            } catch (yahooErr) {
                // Both failed, throw the original TD error (more informative)
                throw err;
            }
        }
    };

    const processMainData = (values) => {
        return values.map((day, index) => {
            let changePercent = 0;
            if (index > 0) {
                const prevClose = values[index - 1].close;
                changePercent = ((day.close - prevClose) / prevClose) * 100;
            }
            return { ...day, changePercent };
        });
    };

    const processComparisonData = (mainDates, compValues) => {
        const compMap = new Map();
        compValues.forEach(v => compMap.set(v.date, v.close));

        let initialCompPrice = null;

        return mainDates.map(date => {
            const close = compMap.get(date);
            if (close === undefined) return null;

            if (initialCompPrice === null) initialCompPrice = close;

            const changePercent = ((close - initialCompPrice) / initialCompPrice) * 100;
            return { date, close, changePercent };
        }).filter(d => d !== null);
    };

    const fetchStockHistory = useCallback(async (ticker, startDate, comparisonTicker = null) => {
        if (!ticker || !startDate) return;

        setLoading(true);
        setError(null);
        setStockData([]);
        setComparisonData(null);

        try {
            const today = new Date().toISOString().split('T')[0];

            // 1. Fetch Main Ticker
            const mainResult = await fetchTickerData(ticker, startDate, today);
            const processedMain = processMainData(mainResult.values);
            setStockData(processedMain);
            setMetaData(mainResult.meta);

            // 2. Fetch Comparison Ticker (if requested)
            if (comparisonTicker) {
                try {
                    const compResult = await fetchTickerData(comparisonTicker, startDate, today);
                    const mainDates = processedMain.map(d => d.date);
                    const processedComp = processComparisonData(mainDates, compResult.values);
                    setComparisonData(processedComp);
                } catch (compErr) {
                    console.warn('Comparison fetch failed:', compErr);
                    setError(`Main ticker loaded, but comparison failed: ${compErr.message}`);
                }
            }

        } catch (err) {
            console.error('API Error:', err);
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        stockData,
        comparisonData,
        metaData,
        fetchStockHistory
    };
};
