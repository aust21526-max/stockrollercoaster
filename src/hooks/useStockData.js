import { useState, useCallback } from 'react';

const API_KEYS = [
    'b72294ade9554b9d81e5074a5a0c52a2', // Key 1
    '0b6bda73abdb4b6d9b90a74189fdcbb7', // Key 2
    '300a4be26d10484aba6c202b4c9f7635'  // Key 3
];

const getRandomKey = () => API_KEYS[Math.floor(Math.random() * API_KEYS.length)];

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

        console.log('Fetching fresh data for', ticker);
        const apiKey = getRandomKey();
        const url = `https://api.twelvedata.com/time_series?symbol=${ticker}&interval=1day&start_date=${startDate}&end_date=${endDate}&outputsize=5000&apikey=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === 'error') {
            throw new Error(data.message || `Failed to fetch data for ${ticker}`);
        }

        if (!data.values || data.values.length === 0) {
            throw new Error(`No data found for ${ticker}`);
        }

        // Process data
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
        return result; // Return raw sorted values wrapper
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
        // Map comparison data by date for O(1) lookup
        const compMap = new Map();
        compValues.forEach(v => compMap.set(v.date, v.close));

        // Create a normalized comparison line
        // Finding the first valid data point to normalize (start at 0%)
        let initialCompPrice = null;

        return mainDates.map(date => {
            const close = compMap.get(date);
            if (close === undefined) return null; // Missing data for this date

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
                // Add a small delay to be nice to the API if strict rate limits apply, 
                // but with 3 keys it should be fine.
                // await new Promise(r => setTimeout(r, 500)); 

                try {
                    const compResult = await fetchTickerData(comparisonTicker, startDate, today);
                    const mainDates = processedMain.map(d => d.date);
                    const processedComp = processComparisonData(mainDates, compResult.values);
                    setComparisonData(processedComp);
                } catch (compErr) {
                    console.warn('Comparison fetch failed:', compErr);
                    // Don't fail the whole request, just show main
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
