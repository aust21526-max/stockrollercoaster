import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useStockData } from './hooks/useStockData';
import { useLang } from './i18n/LanguageContext';
import InputSection from './components/InputSection';
import RollercoasterChart from './components/RollercoasterChart';
import ResultCard from './components/ResultCard';
import { Globe } from 'lucide-react';

// Pages
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Contact from './pages/Contact';
import Blog from './pages/Blog';
import Leaderboard from './components/Leaderboard';
import PortfolioMode from './components/PortfolioMode';
import DailyChallenge from './components/DailyChallenge';
import TicketCollection from './components/TicketCollection';

function HomePage() {
    const [ticker, setTicker] = useState('');
    const [options, setOptions] = useState({ avgPrice: null, quantity: null, comparisonTicker: null });
    const { loading, error, stockData, comparisonData, fetchStockHistory } = useStockData();
    const [hasRun, setHasRun] = useState(false);
    const { lang, toggleLang, t } = useLang();
    const [battleInfo, setBattleInfo] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const challenger = params.get('c_name');
        const cTicker = params.get('c_ticker');
        const cReturn = params.get('c_return');

        if (challenger && cTicker && cReturn) {
            setBattleInfo({
                name: challenger,
                ticker: cTicker,
                returnRate: parseFloat(cReturn)
            });
        }
    }, []);

    const handleRideStart = async (newTicker, startDate, advancedOptions = {}) => {
        setTicker(newTicker);
        setOptions(advancedOptions);
        await fetchStockHistory(newTicker, startDate, advancedOptions.comparisonTicker);
        setHasRun(true);
    };

    const handleReset = () => {
        setHasRun(false);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans antialiased overflow-x-hidden selection:bg-cyan-500/30">
            {/* Background Ambience */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/8 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/8 rounded-full blur-[150px]" />
                <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-cyan-600/5 rounded-full blur-[100px]" />
            </div>

            {/* Language Toggle (Fixed) */}
            <button
                onClick={toggleLang}
                className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-full text-xs font-bold text-slate-400 hover:text-white hover:border-slate-500 transition-all shadow-lg"
                title={lang === 'ko' ? 'Switch to English' : '한국어로 변경'}
            >
                <Globe className="w-3.5 h-3.5" />
                {lang === 'ko' ? 'ENG' : '한국어'}
            </button>

            <div className="relative z-10 container mx-auto px-4 py-6 md:py-10 flex flex-col items-center min-h-screen">
                {/* Header */}
                <header className="text-center mb-8 md:mb-12 animate-fade-in-down">
                    <div className="mb-4 text-5xl">🎢</div>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter mb-3">
                        <span className="bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                            {t('headerTitle1')}
                        </span>
                        <br />
                        <span className="text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                            {t('headerTitle2')}
                        </span>
                    </h1>
                    <p className="text-slate-500 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
                        {t('headerDesc1')}
                        <br />
                        <span className="text-slate-400 font-semibold">{t('headerDesc2')}</span>
                    </p>

                    {/* Quick Nav Links */}
                    <div className="flex justify-center gap-3 mt-4">
                        <Link to="/leaderboard" className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all">
                            🏆 Leaderboard
                        </Link>
                        <Link to="/portfolio" className="px-3 py-1.5 bg-violet-500/10 border border-violet-500/30 rounded-full text-xs font-bold text-violet-400 hover:bg-violet-500/20 transition-all">
                            📊 Portfolio
                        </Link>
                        <Link to="/challenge" className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs font-bold text-orange-400 hover:bg-orange-500/20 transition-all">
                            📅 Daily Challenge
                        </Link>
                        <Link to="/collection" className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition-all">
                            🎟️ My Tickets
                        </Link>
                    </div>
                </header>

                {/* Dynamic Content */}
                {!hasRun || loading ? (
                    <div className="w-full animate-fade-in-up">
                        <InputSection onRideStart={handleRideStart} loading={loading} battleInfo={battleInfo} />
                        {error && (
                            <div className="max-w-lg mx-auto mt-4 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-center text-sm">
                                ⚠️ {error}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full flex flex-col items-center animate-fade-in">
                        <ResultCard
                            ticker={ticker}
                            data={stockData}
                            avgPrice={options.avgPrice}
                            quantity={options.quantity}
                            comparisonTicker={options.comparisonTicker}
                            comparisonData={comparisonData}
                            battleInfo={battleInfo}
                            chartNode={<RollercoasterChart
                                ticker={ticker}
                                data={stockData}
                                avgPrice={options.avgPrice}
                                comparisonData={comparisonData}
                                comparisonTicker={options.comparisonTicker}
                            />}
                        />
                        <button
                            onClick={handleReset}
                            className="mt-10 mb-4 px-6 py-3 text-slate-500 hover:text-white transition-all border border-slate-800 hover:border-slate-600 rounded-full text-sm font-medium"
                        >
                            {t('tryAnother')}
                        </button>
                    </div>
                )}

                {/* Footer with subtle legal links */}
                <footer className="mt-auto py-6 text-center text-slate-700 text-xs space-y-2">
                    <div>
                        Built with 🎢 by <span className="text-slate-500 font-bold">Antigravity</span> • {t('footer')}
                    </div>
                    <div className="flex justify-center gap-3 text-slate-600">
                        <Link to="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
                        <span>·</span>
                        <Link to="/terms" className="hover:text-slate-400 transition-colors">Terms of Service</Link>
                        <span>·</span>
                        <Link to="/contact" className="hover:text-slate-400 transition-colors">Contact</Link>
                    </div>
                </footer>
            </div>
        </div>
    );
}

function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/portfolio" element={<PortfolioMode />} />
            <Route path="/challenge" element={<DailyChallenge />} />
            <Route path="/collection" element={<TicketCollection />} />
        </Routes>
    );
}

export default App;
