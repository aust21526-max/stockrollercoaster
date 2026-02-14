/**
 * Curated database of major stock market events
 * Used to show contextual news when clicking chart event markers
 */

const MAJOR_EVENTS = [
    // === COVID-19 Crash (March 2020) ===
    { tickers: ['*'], dateRange: ['2020-02-20', '2020-03-23'], headline: 'COVID-19 Pandemic Crash', desc: 'Global markets plunged as COVID-19 spread worldwide, triggering lockdowns and economic uncertainty.' },
    { tickers: ['*'], dateRange: ['2020-03-24', '2020-04-15'], headline: 'Post-COVID Recovery Rally', desc: 'Markets rebounded sharply after massive government stimulus packages and Fed rate cuts.' },

    // === GameStop Saga ===
    { tickers: ['GME'], dateRange: ['2021-01-11', '2021-01-28'], headline: 'GameStop Short Squeeze 🚀', desc: 'Reddit\'s r/WallStreetBets triggered the biggest short squeeze in history. GME surged from $20 to $483.' },
    { tickers: ['GME', 'AMC'], dateRange: ['2021-01-29', '2021-02-19'], headline: 'Meme Stock Crash', desc: 'Robinhood restricted trading, triggering a massive selloff in GME and other meme stocks.' },
    { tickers: ['AMC'], dateRange: ['2021-05-24', '2021-06-02'], headline: 'AMC Ape Rally', desc: 'AMC surged 300%+ as retail investors dubbed "Apes" coordinated another meme stock squeeze.' },

    // === Tesla ===
    { tickers: ['TSLA'], dateRange: ['2020-08-11', '2020-08-31'], headline: 'Tesla 5:1 Stock Split', desc: 'Tesla announced a 5-for-1 stock split, sending shares soaring as retail investors piled in.' },
    { tickers: ['TSLA'], dateRange: ['2021-01-08', '2021-01-11'], headline: 'Elon Musk Becomes Richest Person', desc: 'Tesla\'s rally made Elon Musk the world\'s richest person, surpassing Jeff Bezos.' },
    { tickers: ['TSLA'], dateRange: ['2021-11-01', '2021-11-09'], headline: 'Musk Twitter Poll Selloff', desc: 'Elon Musk asked Twitter followers if he should sell 10% of his Tesla stock. The stock dropped 16%.' },
    { tickers: ['TSLA'], dateRange: ['2022-08-25', '2022-08-25'], headline: 'Tesla 3:1 Stock Split', desc: 'Tesla completed its second stock split in two years.' },

    // === Meta/Facebook ===
    { tickers: ['META'], dateRange: ['2022-02-02', '2022-02-04'], headline: 'Meta\'s Historic Crash 📉', desc: 'Meta lost $230B in market cap in a single day — the largest one-day loss in U.S. stock market history.' },
    { tickers: ['META'], dateRange: ['2022-10-26', '2022-10-27'], headline: 'Meta Metaverse Losses Mount', desc: 'Reality Labs reported $3.7B quarterly loss. Investors questioned Zuckerberg\'s metaverse bet.' },
    { tickers: ['META'], dateRange: ['2023-02-01', '2023-02-02'], headline: 'Year of Efficiency Rally', desc: 'Meta surged 23% after Zuckerberg declared 2023 the "Year of Efficiency" with massive layoffs.' },

    // === NVIDIA ===
    { tickers: ['NVDA'], dateRange: ['2023-05-24', '2023-05-25'], headline: 'NVIDIA AI Boom 🤖', desc: 'NVIDIA surged 24% in one day after reporting revenue guidance that crushed estimates, fueled by AI demand.' },
    { tickers: ['NVDA'], dateRange: ['2024-02-21', '2024-02-22'], headline: 'NVIDIA Earnings Blowout', desc: 'NVIDIA reported 265% revenue growth, cementing its position as the AI chip leader.' },
    { tickers: ['NVDA'], dateRange: ['2024-06-18', '2024-06-20'], headline: 'NVIDIA Becomes Most Valuable Company', desc: 'NVIDIA briefly surpassed Microsoft and Apple as the world\'s most valuable public company.' },

    // === Apple ===
    { tickers: ['AAPL'], dateRange: ['2022-01-03', '2022-01-04'], headline: 'Apple Hits $3T Market Cap', desc: 'Apple became the first company to reach a $3 trillion market capitalization.' },
    { tickers: ['AAPL'], dateRange: ['2023-06-05', '2023-06-06'], headline: 'Apple Vision Pro Announcement', desc: 'Apple unveiled Vision Pro at WWDC, marking its entry into spatial computing.' },

    // === Crypto-related stocks ===
    { tickers: ['COIN'], dateRange: ['2022-05-09', '2022-05-12'], headline: 'Luna/Terra Collapse 💥', desc: 'The Terra/Luna ecosystem collapsed, dragging down all crypto assets and related stocks.' },
    { tickers: ['COIN'], dateRange: ['2022-11-08', '2022-11-11'], headline: 'FTX Collapse', desc: 'FTX filed for bankruptcy, sending shockwaves through the crypto industry.' },
    { tickers: ['COIN'], dateRange: ['2024-01-10', '2024-01-11'], headline: 'Bitcoin ETF Approved', desc: 'SEC approved the first Bitcoin spot ETFs, a watershed moment for crypto adoption.' },

    // === Broad Market ===
    { tickers: ['*'], dateRange: ['2022-06-13', '2022-06-16'], headline: 'Fed 75bps Rate Hike', desc: 'The Federal Reserve raised rates by 75 basis points — the largest hike since 1994.' },
    { tickers: ['*'], dateRange: ['2022-09-13', '2022-09-13'], headline: 'Hot CPI Report Crash', desc: 'S&P 500 dropped 4.3% after inflation came in hotter than expected at 8.3%.' },
    { tickers: ['*'], dateRange: ['2023-03-10', '2023-03-13'], headline: 'SVB Bank Collapse 🏦', desc: 'Silicon Valley Bank collapsed — the largest bank failure since 2008.' },

    // === Other notable ===
    { tickers: ['NFLX'], dateRange: ['2022-04-19', '2022-04-20'], headline: 'Netflix Subscriber Loss Shock', desc: 'Netflix lost subscribers for the first time in a decade. Stock crashed 35% in a single day.' },
    { tickers: ['AMZN'], dateRange: ['2022-04-28', '2022-04-29'], headline: 'Amazon Post-Earnings Crash', desc: 'Amazon fell 14% after reporting its slowest revenue growth in 20 years.' },
    { tickers: ['PLTR'], dateRange: ['2021-01-25', '2021-01-27'], headline: 'Palantir Reddit Rally', desc: 'Palantir surged as WallStreetBets added it to their meme stock rotation.' },
    { tickers: ['BA'], dateRange: ['2020-03-16', '2020-03-23'], headline: 'Boeing Crisis Deepens', desc: 'Boeing hit COVID lows while still dealing with 737 MAX grounding fallout.' },
    { tickers: ['DIS'], dateRange: ['2021-11-10', '2021-11-11'], headline: 'Disney+ Subscriber Miss', desc: 'Disney fell 7% after Disney+ subscriber growth missed expectations.' },
];

/**
 * Find a known major event for a given ticker and date
 * @param {string} ticker - Stock ticker symbol
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {{ headline: string, desc: string } | null}
 */
export function getKnownEvent(ticker, date) {
    const targetDate = new Date(date);

    for (const event of MAJOR_EVENTS) {
        const [start, end] = event.dateRange.map(d => new Date(d));
        // Extend range by 3 days for fuzzy matching
        start.setDate(start.getDate() - 3);
        end.setDate(end.getDate() + 3);

        if (targetDate >= start && targetDate <= end) {
            if (event.tickers.includes('*') || event.tickers.includes(ticker.toUpperCase())) {
                return { headline: event.headline, desc: event.desc };
            }
        }
    }

    return null;
}

/**
 * Generate a contextual description for an event based on price data
 * @param {string} type - 'drop' | 'loop' | 'peak' | 'trough'
 * @param {number} change - Percentage change
 * @param {number} close - Closing price
 * @returns {string}
 */
export function getEventContext(type, change, close) {
    const absChange = Math.abs(change).toFixed(1);

    if (type === 'drop') {
        if (change < -20) return `A devastating ${absChange}% crash in just 5 trading days. This level of decline is extremely rare.`;
        if (change < -10) return `A sharp ${absChange}% decline over 5 days. This kind of selloff often triggers panic selling.`;
        return `A ${absChange}% dip over 5 days. Significant enough to shake out weak hands.`;
    }
    if (type === 'loop') {
        if (change > 30) return `An explosive ${absChange}% surge in 5 days! This kind of rally is once-in-a-decade territory.`;
        if (change > 15) return `A powerful ${absChange}% rally in 5 days. Momentum traders love this kind of move.`;
        return `A solid ${absChange}% gain over 5 days. Strong buying pressure.`;
    }
    if (type === 'peak') return `Reached the all-time high at $${close.toFixed(2)}. Everything looks perfect here... but nothing lasts forever.`;
    if (type === 'trough') return `Hit rock bottom at $${close.toFixed(2)}. Maximum fear. Maximum pain. But also maximum opportunity.`;

    return '';
}

export default MAJOR_EVENTS;
