import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const articles = [
    {
        id: 1,
        title: 'The Dot-com Bubble Burst (2000): Lessons from the Internet Craze',
        date: '2026-01-15',
        content: `In the late 1990s, anticipation for the revolutionary technology called the Internet drove global investors into a frenzy. Ideally adding the suffix ".com" to a company name caused its value to jump dozens of times, and companies with no sales, let alone business plans, were valued at billions of dollars. The NASDAQ Composite Index skyrocketed from about 1,000 points in 1995 to 5,048 points in March 2000.

However, the bubble did not last long. As the reality of companies without earnings began to be revealed, the NASDAQ plunged about 78% from its peak in March 2000 to 1,114 points in October 2002. Even blue-chip stocks like Cisco and Intel fell more than 80%, and hundreds of dot-com companies went bankrupt. Once-famous companies like Pets.com, Webvan, and eToys disappeared into history.

The most important lesson the Dot-com Bubble left for modern investors is that "technological innovation and corporate profitability are separate." The Internet itself was a real revolution, but very few companies made money from it. When investment sentiment overheats, the habit of coolly analyzing fundamentals (the actual value of a company) becomes even more important.

It also demonstrates the danger of herd mentality. Investing with the mindset of "everyone else is doing it, so should I" can eventually lead to huge losses. Warren Buffett was criticized for being "behind the times" for not investing in IT stocks during this period, but his principles eventually proved correct. The hardest part of investing is having the courage to walk against the crowd.`
    },
    {
        id: 2,
        title: 'Lehman Brothers Bankruptcy & Global Financial Crisis (2008): The Price of Greed',
        date: '2026-01-22',
        content: `On September 15, 2008, Lehman Brothers, a US investment bank with a 158-year history, filed for bankruptcy. This event became the symbol of the global financial crisis triggered by the subprime mortgage (non-prime mortgage loan) crisis. The S&P 500 fell about 57% from its peak of 1,576 in October 2007 to 676 in March 2009.

The root cause of the crisis was complex. In a low-interest-rate environment, banks recklessly issued loans to people with low credit ratings, and these loans were packaged into complex derivatives (CDOs, MBS, etc.) and sold worldwide. Credit rating agencies gave these risky products AAA top ratings, and insurance companies like AIG insured these products (CDS). Everything was a house of cards built on the premise that "housing prices never fall."

For individual investors, this event revealed the existence of "systemic risk." No matter how good the stocks you hold are, if the entire financial system shakes, all assets fall together. Even if you diversify, you must recognize that diversification within the same system has limits. That is why asset class diversification (stocks, bonds, gold, real estate, etc.) is important.

One positive point is that investors who endured this crisis enjoyed the benefits of the longest bull market in history (2009-2020). The S&P 500 rose about 400% from its 2009 low to early 2020. The saying "The dawn comes after the darkest night" also applies to the stock market.`
    },
    {
        id: 3,
        title: 'Black Monday (1987): The Day the Market Crashed 22%',
        date: '2026-01-29',
        content: `On October 19, 1987, the Dow Jones Industrial Average plunged 22.6% in a single day. This is the largest one-day drop in US stock market history, a record that has yet to be broken. In today's terms, it would be equivalent to the Dow falling more than 8,000 points in a day.

There is still debate about the cause of Black Monday, but it is analyzed that several factors acted in combination. An automated trading strategy called "Portfolio Insurance," which was widely used at the time, accelerated the decline. When computers detected a drop in stock prices, they automatically sold futures, and when this dragged the market down further, a vicious cycle of selling occurred. In today's terms, it can be called a "failure of algorithmic trading."

Interestingly, the recovery after Black Monday was surprisingly fast. The Dow recovered its previous high in about two years, leading to the massive bull market of the 1990s. Investors who panicked and left the market missed this opportunity for recovery.

The lessons left by Black Monday are clear. First, short-term market movements are unpredictable. There were no signs until the day before. Second, selling out of fear can be the worst decision. Investors who sold on the day of the crash locked in a 22% loss, but those who held on recovered their principal two years later. Third, excessive leverage (debt investing) must be avoided to prepare for systemic risk. A 22% drop in a leveraged state means the entire account evaporates.`
    },
    {
        id: 4,
        title: 'The Covid Crash (2020): Fastest Crash and Recovery in History',
        date: '2026-02-05',
        content: `In February 2020, financial markets panicked due to the global spread of the COVID-19 virus. The S&P 500 fell 33.9% from its peak on February 19, 2020, to its low on March 23, in just 23 trading days. This was the fastest entry into a bear market (a drop of more than 20% from the peak) in history.

Unprecedented lockdowns halted economic activity around the world simultaneously. Airline, hotel, and restaurant stocks plunged 70-80%, and crude oil futures recorded negative prices for the first time in history. The VIX (Fear Index) recorded 82.69, surpassing even the 80.86 during the 2008 financial crisis. The fear in the market at the time was indescribable.

However, the subsequent rebound was even more dramatic. With the US Federal Reserve's unlimited quantitative easing, massive fiscal stimulus packages, and news of vaccine development, the market made a V-shaped recovery. It took only 5 months for the S&P 500 to recover its peak, and the NASDAQ broke new highs even faster. "Untact" beneficiaries like Tesla, Zoom, and Facebook recorded returns of several to dozens of times.

The lessons of the Covid Crash are multi-layered. First, unpredictable "Black Swan" events can happen at any time, so it is necessary to always hold a certain percentage of emergency funds (cash). Second, investors who bought when fear was at its peak achieved historical returns. It is a case where the saying "Crisis is opportunity" applied best. Finally, it was an event where we could realize how significant the impact of central bank and government policy responses is on the market.`
    },
    {
        id: 5,
        title: 'Asian Financial Crisis (1997): IMF and the Korean Experience',
        date: '2026-02-12',
        content: `In July 1997, starting with the collapse of the Thai baht, a financial crisis spread across Asia. South Korea also had to apply for an IMF (International Monetary Fund) bailout due to a lack of foreign exchange reserves and excessive short-term foreign debt. The KOSPI index plunged about 75% from its peak of 1,145 in 1994 to 280 in June 1998, and the won-dollar exchange rate soared from the 800 won range to nearly 2,000 won.

The root cause of the IMF crisis lay in structural problems in the Korean economy. Excessive leveraged management by chaebols (debt ratios were typically 300-400%), collusion between politics and business, poor risk management by financial institutions, and the immaturity of the foreign exchange market all played a part. When the crisis hit, foreign capital left all at once, revealing the bottom of foreign exchange reserves.

As a condition for the bailout, the IMF demanded high interest rate policies, corporate restructuring, and financial reform. As a result, numerous companies went bankrupt, and the unemployment rate exceeded 7%. Large conglomerates such as Daewoo Group, Hanbo, Kia, and Sammi collapsed one after another. Citizens participated in the "Gold Collection Movement" to overcome the foreign exchange crisis, and this process became deeply engraved in the collective memory of Koreans.

The IMF crisis provides special lessons for Korean investors. First, the importance of exchange rate risk. When investing in overseas assets, exchange rate fluctuations have a decisive impact on returns. Second, excessive debt (leverage) is fatal in a crisis situation, whether for companies or individuals. Third, opportunities arise from structural changes after a crisis. Since the IMF crisis, companies like Samsung Electronics, SK Hynix, and Hyundai Motor have been reborn as companies with global competitiveness.`
    },
    {
        id: 6,
        title: 'The Psychology of HODL: Why We Can\'t Stand Losses',
        date: '2026-02-19',
        content: `"HODL"—a slang term for holding assets for the long term—seems easy, but practically, it is one of the hardest investment strategies to practice. The reason lies in human psychological instincts. Studies in Behavioral Finance have scientifically revealed why investors fail to act rationally.

A representative example is "Loss Aversion." According to research by Nobel Prize laureate Daniel Kahneman, humans feel about twice as much pain from a loss as they do pleasure from a gain of the same amount. The pain of losing $1,000 is twice as great as the joy of earning $1,000. Because of this, investors want to lock in losses quickly and tend to panic sell even if stock prices fall slightly.

Another trap is "Present Bias." The human brain is designed to prefer small immediate rewards over large future rewards. "10% profit right now" feels more attractive than "200% profit in 3 years" because of this bias. This was evolutionarily rational (avoiding immediate danger was necessary for survival), but it is poison for investing. The long-term return of the stock market is 7-10% annually, and it takes at least 5-10 years for the compound interest effect to accumulate.

"Confirmation Bias" is also dangerous. It is the tendency to ignore negative news about stocks one owns and selectively accept only positive news. Once the belief that "this stock will definitely go up" is formed, objective judgment becomes difficult. Conversely, if a stock sold once goes up, thinking "I am an unlucky person" and buying it again is also an extension of this bias.

Strategies for successfully practicing HODL are as follows. First, write an investment journal to record the timing and reasons for buying and selling. Second, do not check the charts every day (checking frequency and panic selling probability are directly proportional). Third, reduce stress about timing with a split buying strategy. Fourth, set up trading rules based on a system, not emotions.`
    },
    {
        id: 7,
        title: 'Fear and Greed Index: How to Read Market Sentiment',
        date: '2026-02-26',
        content: `"Be fearful when others are greedy, and greedy when others are fearful." This famous quote by Warren Buffett penetrates the essence of investing. So how can we measure the level of market fear and greed?

CNN's "Fear & Greed Index" compiles 7 indicators to express market sentiment as a number from 0 (extreme fear) to 100 (extreme greed). These 7 indicators are: (1) Market Momentum (S&P 500 vs 125-day moving average), (2) Stock Price Strength (52-week highs vs lows), (3) Stock Price Breadth (trading volume of rising vs falling stocks), (4) Put/Call Options Ratio, (5) Junk Bond Demand (investment grade vs high yield spread), (6) Market Volatility (VIX), and (7) Safe Haven Demand (difference between stock vs bond yields).

Historically, investors who bought in the extreme fear zone (below 25) earned average returns of more than 20% over the next year. Conversely, investors who bought in the extreme greed zone (above 75) often faced corrections in the following months. During the Covid crash in March 2020, this index fell to 2, and during the meme stock (GameStop) craze in 2021, it soared to 95.

However, following this index blindly is dangerous. Extreme fear can lead to deeper fear, and greed often develops into greater greed. This index does not tell you the exact "timing" and only provides a hint about the "direction."

In practice, it can be used as follows. Start split buying when the index is in the extreme fear zone, and realize some profits when it is in the extreme greed zone. The key is to back up the "courage to stand on the opposite side of the market" with quantified data. Decisions based on data rather than emotions produce better results in the long run. Also, referring to the VIX (Volatility Index) together allows for more sophisticated judgment. If VIX is over 30, the market is unstable; if over 40, it can be seen as extremely unstable.`
    },
    {
        id: 8,
        title: 'The Science of Diversification: The True Meaning of "Don\'t Put All Your Eggs in One Basket"',
        date: '2026-03-05',
        content: `"Don't put all your eggs in one basket." It is one of the most basic adages of investing, but many investors fail to practice this principle properly. Simply buying multiple stocks is not diversification. Harry Markowitz won the Nobel Prize in Economics for Modern Portfolio Theory, and his key insight was that "correlation between assets" is the core of diversification.

For example, investing in both Samsung Electronics and SK Hynix is not true diversification. Both stocks belong to the semiconductor industry, so they fall together when the entire industry is in a recession. True diversification is combining assets that move in different directions. For example, it is effective to diversify across various sectors like Technology + Healthcare + Consumer Goods + Defensive Stocks, or to diversify asset classes themselves like Stocks + Bonds + Gold + Real Estate (REITs).

Specifically explaining the importance of correlation: If the correlation coefficient between two assets is +1, they move in completely the same direction, so there is no diversification effect. If 0, they move independently, so there is some diversification effect. If -1, they move completely oppositely, so theoretically perfect hedging is possible. The correlation between stocks and bonds has historically been around -0.2 to -0.5, which is why the traditional 60/40 portfolio (60% stocks, 40% bonds) has been loved for a long time.

However, there are years like 2022 when stocks and bonds fall simultaneously. This is because the Fed raised interest rates sharply as inflation soared. In such an environment, traditional diversification becomes less effective. Therefore, expanding the breadth of diversification with additional asset classes such as Gold, commodities, and overseas real estate is the evolved form of modern portfolio theory.

A practical guide for individual investors is as follows. First, using ETFs allows for global diversification even with small amounts. Allocating 40/20/30/10 to S&P 500 ETF (SPY), International Stock ETF (VXUS), Bond ETF (AGG), and Gold ETF (GLD) respectively makes for a fairly solid portfolio. And rebalancing (readjusting to original ratios) once every 6 months to 1 year automatically produces the effect of "buy low, sell high."`
    },
    {
        id: 9,
        title: 'Inflation and the Stock Market: Investment Strategies When Money Loses Value',
        date: '2026-03-12',
        content: `Inflation (rising prices) is the enemy of the investor. Just as purchasing power of the same 1 million won is different from 10 years ago, inflation steadily eats away at the real value of assets like an "invisible tax." If 3% annual inflation continues for 20 years, the real purchasing power of the current 10 million won decreases to about 5.54 million won. Nearly half disappears.

In 2021-2022, US inflation recorded a 40-year high of 9.1% (based on June 2022 CPI). Massive quantitative easing and fiscal spending after Corona, supply chain bottlenecks, and soaring energy and food prices due to the Ukraine-Russia war were the causes. The Federal Reserve raised the benchmark interest rate sharply from 0.25% to 5.25% to curb inflation, and both stocks and bonds were hit hard in the process.

Historically, stocks are an asset that beats inflation in the long run. Because companies can raise product prices to pass on inflation, and sales and profits increase in nominal terms. From 1926 to 2023, the average annual nominal return of US stocks was about 10.2%, and since inflation was about 3% during the same period, the real return reaches about 7%. It is a much more effective inflation defense than bank deposits or cash.

However, the story is different in the short term. In times of soaring inflation, central bank interest rate hikes have a negative impact on the stock market. High interest rates increase corporate borrowing costs, lower the present value (discount rate) of future cash flows, and attract investors to bonds or deposits that pay high interest. In particular, high-growth tech stocks react most sensitively to rising interest rates.

The investment strategy in the era of inflation is as follows. First, invest in companies with Pricing Power. Companies like Coca-Cola and Apple, whose demand does not decrease even if product prices are raised, are strong in inflationary periods. Second, include TIPS (Treasury Inflation-Protected Securities) in your portfolio. Third, allocate real estate (REITs) and commodity-related assets. Fourth, do not increase cash weighting excessively. In an inflationary environment, cash is the asset whose value falls the fastest.`
    },
    {
        id: 10,
        title: 'Mental Management for Long-term Investing: Investing in Your Future Self',
        date: '2026-03-19',
        content: `Currently, the most important thing to succeed in stock investing is not superior analytical skills or timing sense. It is "mental management." Peter Lynch said, "The most important organ in the stock market is not the brain, but the stomach. You need the guts to hold onto stocks even in a crash." In fact, according to Fidelity's internal research, the accounts with the best returns were those where the owner had died or had forgotten about the existence of the account. It is ironic that performance was better with less human intervention.

The first principle of mental management is "Invest only with money you can afford to lose." If you put money you need for immediate living expenses or emergency funds into stocks, you will get impatient even if it drops a little and sell in fear. You should secure at least 6 months to 1 year of living expenses in deposits and invest with the remaining surplus funds to deal with the market with a relaxed mind.

The second principle is "Put time on your side." Looking at the history of the S&P 500, the probability of making a profit when holding for 1 year is about 73%, about 87% for 5 years, and close to 100% for more than 15 years. No matter how the market moves in the short term, the tendency to rise in the long term is a historical fact. The human economy has grown in the long term through technological innovation, population growth, and productivity improvement, and the stock market reflects this.

The third principle is "Establish your own investment principles and document them." "What will I do if this stock drops 30%?" "What will I do if I reach my target return?" If you don't decide on these scenarios in advance, you will make impulsive decisions in moments of heightened emotion. Recording the reasons for trading and emotional state in an investment journal allows you to objectively identify your investment patterns over time.

The fourth principle is "Block out the noise." YouTube stock channels, investment opinions on social media, brokerage report notifications... modern people are exposed to dozens of investment-related pieces of information a day. 99% of this information is noise that has no impact on long-term investment performance. Getting excited or depressed by provocative headlines like "Earnings Surprise This Week!", "Urgent! Sell Signal!" only consumes your mental energy. Checking quarterly reports once is enough.

Finally, "Believe in the magic of compounding." The anecdote that Einstein called compounding "the eighth wonder of the world" is famous. If you invest 500,000 won every month for 30 years at a 10% annual return, the principal of 180 million won becomes about 1 billion won. The magic of compounding works explosively as time gets longer. However, for this magic to work, you must not break the chain of compounding with panic selling along the way. Mental management can ultimately be called a "fight to protect compounding."`
    },
    {
        id: 11,
        title: 'The Great Depression (1929): The Worst Scenario in Capitalist History',
        date: '2026-03-26',
        content: `The Great Depression that occurred in 1929 is considered the most important and destructive event in modern economic history. The US in the 1920s, called "The Roaring Twenties," enjoyed an unprecedented economic boom. Radios, cars, and refrigerators became common, and the stock market seemed like it would rise endlessly. People borrowed money (margin trading) to buy stocks, and companies continued overproduction.

However, on October 24, 1929, 'Black Thursday', and October 29, 'Black Tuesday', the market collapsed. The Dow Jones index plunged 89% from its peak, falling from 381 points in 1929 to 41 points in 1932. It took a whopping 25 years to recover this loss (recovered in 1954).

The Great Depression went beyond a simple stock market crash and destroyed the real economy. Due to bank runs (mass withdrawals), more than 9,000 banks went bankrupt, and the US unemployment rate soared to 25%. Streets were overflowing with unemployed people, and long lines formed in front of soup kitchens. This shock spread worldwide, collapsing the European economy, and eventually became one of the causes of World War II.

The lessons this event teaches are clear. First, excessive leverage (debt) is a shortcut to ruin. During the Great Depression, many investors bought stocks with only 10% margin, but lost their entire fortunes due to margin calls when stock prices fell even slightly. Second, "This time is different" are the most dangerous words. It is a famous anecdote that Irving Fisher declared "Stock prices have reached what looks like a permanently high plateau" just before the crash began. Third, the role of government and central banks. Reflecting on the fact that the Fed's tight monetary policy and the government's protectionism (Smoot-Hawley Tariff Act) at the time exacerbated the crisis, macroeconomic policy has since developed significantly.`
    },
    {
        id: 12,
        title: 'The GameStop (GME) Saga (2021): The Revolt of the Retail Investors',
        date: '2026-04-02',
        content: `In January 2021, one of the most bizarre and dramatic events in Wall Street history occurred. An all-out war broke out between individual investors (retail) and giant hedge funds over the stock of video game retailer 'GameStop'.

The incident began on the 'WallStreetBets' board of the online community Reddit. When it became known that hedge funds like Melvin Capital had placed excessive short selling bets on GameStop's stock price decline, individual investors launched an organized buying campaign saying, "Let's bankrupt the hedge funds."

The result was shocking. The stock price, which was around $17 in early 2021, soared to $483 in just a few days. It was a rise of a whopping 2,700%. Hedge funds that had shorted were driven into a 'Short Squeeze' situation where they had to buy back stocks to prevent further losses as the stock price rose, which became fuel driving the stock price even higher. Melvin Capital eventually suffered trillions of won in losses and had to receive a bailout.

This event demonstrated the democratization of financial markets and the power of social media, but at the same time, it revealed the dangers of speculative madness. A state where stock prices skyrocket solely due to supply and demand, regardless of fundamentals (corporate performance), could not last long. Since then, the stock price has plunged again, and many individual investors who bought at the high have suffered large losses. Also, as brokerages like Robinhood disabled the buy button, controversy over market unfairness heated up.

Lessons from the GME Saga: The market is sometimes irrational, and this irrational state can last longer than expected. It reminded us that short selling is theoretically a dangerous strategy where losses can be infinite. Also, one must keep in mind that investing swept up in herd mentality is no different from gambling.`
    },
    {
        id: 13,
        title: 'The Flash Crash (2010): $1 Trillion Evaporated in 36 Minutes',
        date: '2026-04-09',
        content: `On May 6, 2010, at 2:32 PM, the peaceful US stock market suddenly began to crash madly. The Dow Jones index plunged 998.5 points (about 9%) in just a few minutes. Blue chips like P&G plunged 30% in an instant, and Accenture stock traded at 1 cent ($0.01). And even more surprisingly, the market recovered most of the losses in 20 minutes. This event is called the 'Flash Crash'.

The cause was surprisingly a combination of one individual and an algorithm. Trader 'Navinder Singh Sarao' living in the suburbs of London was identified as the culprit. He disrupted the market through fake orders (placing orders without intent to execute to manipulate quotes), and High-Frequency Trading (HFT) algorithms reacting to this poured out sell orders, causing a chain crash.

The 'Spoofing' strategy used by Sarao dried up market liquidity. With buy orders gone, as algorithmic sell orders poured out, prices went into freefall. This event demonstrated how deeply modern financial markets rely on algorithms and computers, and how vulnerable that system can be.

Lesson: Technological advancement has lowered trading costs and increased efficiency, but it has also brought new forms of risk. Investors learned not to blindly trust "Stop-loss" orders. During the Flash Crash, stop-loss orders set to Market Sell were executed at absurd prices (e.g., 1 cent), locking in massive losses. Sometimes doing nothing and waiting for the storm to pass may be the best option.`
    },
    {
        id: 14,
        title: 'Burst of Japan\'s Asset Price Bubble (1990): The Beginning of the Lost 30 Years',
        date: '2026-04-16',
        content: `In the late 1980s, the Japanese economy dominated the world. The real estate and stock markets were so overheated that it was said, "The land value of the Imperial Palace in Tokyo is more expensive than all the land in California, USA." On December 29, 1989, the Nikkei 225 index recorded an all-time high of 38,915 points. Companies bought assets around the world with overflowing money, and the Japanese people believed in eternal prosperity.

However, as soon as the new year of 1990 dawned, the bubble burst. The Bank of Japan's interest rate hike and total loan volume regulations were the triggers. The stock market began to crash, and the real estate market followed suit. In March 2009, the Nikkei index fell to 7,054 points, dropping more than 80% from its peak. Even more shocking is the fact that it took a whopping 34 years (recovered in 2024) to recover this high again.

Since then, Japan has fallen into a swamp of long-term deflation and economic stagnation called the "Lost 30 Years." Due to the decline in asset values, households and companies reduced consumption and investment and focused only on paying off debts (balance sheet recession), which in turn created a vicious cycle of shrinking the economy again.

Japan's case most dramatically demonstrates that beliefs such as "real estate invincibility myth" or "blue chips always go up eventually" can be wrong. If a national economy faces structural problems (population aging, zombie companies, etc.), the stock market can stagnate for decades. This paradoxically proves how dangerous it is to go all-in on a specific country and why global diversified investment is necessary.`
    },
    {
        id: 15,
        title: 'Nifty Fifty Bubble (1970s): "One Decision Stocks"',
        date: '2026-04-23',
        content: `In the late 1960s and early 70s, US institutional investors focused their investments on 50 blue-chip stocks that were "worry-free forever once bought." Companies like Coca-Cola, McDonald's, IBM, Polaroid, and Disney. They were called the 'Nifty Fifty'.

Investors were so convinced of the growth potential of these companies that they ignored Valuation. Polaroid's Price-to-Earnings Ratio (PER) exceeded 90 times, McDonald's 80 times, and Disney 70 times. Considering that the market average PER was around 15-20 times, it was a huge overvaluation. The logic was, "It's okay to buy expensive because they are growing."

However, when a bear market arrived with the 1973 Oil Shock, this bubble burst disastrously. Polaroid fell 90% from its peak, and Avon fell 85%. The companies were still excellent and made good money, but it happened because the stock prices were too expensive. It took more than 10 years for many stocks to recover their peak prices.

The Nifty Fifty bubble teaches the truth that "a good company is not necessarily a good stock." No matter how great a company is, if you buy it at too expensive a price, it cannot be a great investment. It is a lesson we must not forget even amidst the Big Tech investment craze of the 2020s. Investing that ignores Valuation eventually pays the price.`
    }
];

const Blog = () => {
    const [selectedArticle, setSelectedArticle] = useState(null);

    if (selectedArticle !== null) {
        const article = articles[selectedArticle];
        return (
            <div className="min-h-screen bg-slate-950 text-slate-300 font-sans antialiased">
                <div className="max-w-3xl mx-auto px-6 py-16">
                    <button onClick={() => setSelectedArticle(null)} className="text-cyan-400 text-sm hover:underline mb-8 inline-block">&larr; Back to List</button>
                    <article>
                        <h1 className="text-2xl md:text-3xl font-black text-white mb-2">{article.title}</h1>
                        <p className="text-slate-500 text-sm mb-8">{article.date} · Stock Rollercoaster Investment Insights</p>
                        <div className="prose prose-invert prose-sm max-w-none text-slate-400 leading-relaxed whitespace-pre-line">
                            {article.content}
                        </div>
                    </article>
                    <div className="mt-12 pt-6 border-t border-slate-800 text-xs text-slate-600">
                        &copy; 2026 Stock Volatility Rollercoaster. All rights reserved.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-sans antialiased">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <Link to="/" className="text-cyan-400 text-sm hover:underline mb-8 inline-block">&larr; Back to Home</Link>
                <h1 className="text-3xl font-black text-white mb-2">📊 Investment Insights</h1>
                <p className="text-slate-500 text-sm mb-10">Investment Insights · Learning future investment strategies from past lessons.</p>

                <div className="space-y-6">
                    {articles.map((article, index) => (
                        <button
                            key={article.id}
                            onClick={() => setSelectedArticle(index)}
                            className="w-full text-left p-5 bg-slate-900/50 border border-slate-800/50 rounded-xl hover:border-slate-600 hover:bg-slate-800/50 transition-all group"
                        >
                            <p className="text-slate-500 text-xs mb-1">{article.date}</p>
                            <h2 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors">{article.title}</h2>
                            <p className="text-slate-500 text-sm mt-2 line-clamp-2">{article.content.substring(0, 120)}...</p>
                        </button>
                    ))}
                </div>

                <div className="mt-12 pt-6 border-t border-slate-800 text-xs text-slate-600">
                    &copy; 2026 Stock Volatility Rollercoaster. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default Blog;
