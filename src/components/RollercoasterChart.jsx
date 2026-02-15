import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Brush } from 'recharts';
import { detectEvents, findPeakAndTrough } from '../utils/analysis';
import { useLang } from '../i18n/LanguageContext';
import { Play, RotateCcw, Search, ExternalLink } from 'lucide-react';
import EventInfoPanel from './EventInfoPanel';

const CustomTooltip = ({ active, payload, label, ticker }) => {
    const { t } = useLang();
    if (active && payload && payload.length) {
        // Filter out 'aboveLine' and 'belowLine' (implementation details)
        const relevantPayload = payload.filter(p => p.dataKey === 'close' || p.dataKey === 'compClose');
        const mainData = relevantPayload.find(p => p.dataKey === 'close');

        // Use the event from the payload of the first item
        const d = payload[0].payload;

        return (
            <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 p-3 rounded-xl shadow-2xl z-50 min-w-[150px]">
                <p className="font-semibold text-slate-300 text-xs mb-2">{label}</p>

                {relevantPayload.map((entry, idx) => (
                    <div key={idx} className="mb-1">
                        <p className="text-xs text-slate-400 font-bold mb-0.5">{entry.name || (entry.dataKey === 'close' ? ticker : 'Comparison')}</p>
                        <p className="font-mono text-lg font-black" style={{ color: entry.stroke || entry.fill }}>
                            ${entry.value?.toFixed(2)}
                        </p>
                    </div>
                ))}

                {mainData && d.changePercent !== undefined && d.changePercent !== 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <p className={`text-sm font-bold text-center ${d.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {d.changePercent > 0 ? '+' : ''}{d.changePercent.toFixed(2)}%
                        </p>
                    </div>
                )}

                {/* News Search Button */}
                <button
                    className="mt-3 w-full flex items-center justify-center gap-1.5 px-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs text-slate-400 hover:text-white transition-colors border border-slate-700 hover:border-slate-600"
                    onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://www.google.com/search?q=${ticker}+stock+${d.date}&tbm=nws`, '_blank');
                    }}
                >
                    <Search className="w-3 h-3" /> 📰 Search News
                </button>
            </div>
        );
    }
    return null;
};

const CustomDot = (props) => {
    const { cx, cy, payload, ticker, onEventClick } = props;
    if (!cx || !cy || !payload) return null;

    const event = payload._event;
    if (!event) return null;

    // Dynamic sizing based on data length
    // Dynamic sizing based on data length and screen width
    const dataLength = payload.payload ? payload.payload.totalDataLength : 100;
    const isMobile = window.innerWidth < 768; // Simple check for mobile

    let scale = isMobile ? 0.55 : 0.75; // Increased base scale for desktop

    if (dataLength > 365) scale = isMobile ? 0.3 : 0.4;
    else if (dataLength > 100) scale = isMobile ? 0.4 : 0.55;
    else if (dataLength > 50) scale = isMobile ? 0.5 : 0.65;

    let emoji = '';
    let bgColor = '';
    let borderColor = '';
    let size = 5 * scale; // Reduced from 6
    let fontSize = 12 * scale; // Reduced from 14
    let yOffset = -16 * scale; // Adjusted offset

    switch (event) {
        case 'drop':
            emoji = '😱';
            bgColor = '#f43f5e';
            borderColor = '#fda4af';
            break;
        case 'loop':
            emoji = '🚀';
            bgColor = '#10b981';
            borderColor = '#6ee7b7';
            break;
        case 'peak':
            emoji = '🏔️';
            bgColor = '#fbbf24';
            borderColor = '#fde68a';
            size = 7 * scale; // Reduced from 8
            fontSize = 14 * scale; // Reduced from 16
            yOffset = -20 * scale;
            break;
        case 'trough':
            emoji = '🕳️';
            bgColor = '#f43f5e';
            borderColor = '#fda4af';
            size = 7 * scale; // Reduced from 8
            fontSize = 14 * scale; // Reduced from 16
            yOffset = 18 * scale;
            break;
        case 'start':
            emoji = '🎫';
            bgColor = '#fbbf24';
            borderColor = '#fde68a';
            break;
        case 'end':
            emoji = '🏁';
            bgColor = '#22d3ee';
            borderColor = '#a5f3fc';
            break;
        default:
            return null;
    }

    // Format change percentage
    const changePct = payload.change ? (payload.change > 0 ? '+' : '') + payload.change.toFixed(2) + '%' : '';

    return (
        <g
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
                e.preventDefault();
                if (onEventClick) {
                    onEventClick({
                        type: event,
                        date: payload.date,
                        close: payload.close,
                        change: payload.change,
                        index: payload.index
                    });
                }
            }}
        >
            <title>{`${emoji} ${payload.date}\nPrice: $${payload.close.toFixed(2)}\nChange: ${changePct}`}</title>
            <circle cx={cx} cy={cy} r={size + 3 * scale} fill={bgColor} opacity={0.2} />
            <circle cx={cx} cy={cy} r={size} fill={bgColor} stroke={borderColor} strokeWidth={1.5 * scale} />
            <text
                x={cx}
                y={cy + yOffset}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize}
                style={{ pointerEvents: 'none' }}
            >
                {emoji}
            </text>
            {(event === 'peak' || event === 'trough') && (
                <text
                    x={cx}
                    y={cy + (event === 'peak' ? -36 * scale : 34 * scale)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={9 * scale}
                    fontWeight="bold"
                    fill={event === 'peak' ? '#10b981' : '#f43f5e'}
                >
                    ${payload.close.toFixed(0)}
                </text>
            )}
        </g>
    );
};

const RollercoasterChart = ({ data, avgPrice, ticker, comparisonData, comparisonTicker }) => {
    const { t } = useLang();
    const [isRiding, setIsRiding] = useState(false);
    const [animEndIndex, setAnimEndIndex] = useState(data?.length || 0);

    // Initial load animation trigger
    useEffect(() => {
        if (data && data.length > 0) {
            handleReplay();
        }
    }, [data]);

    const handleReplay = () => {
        setIsRiding(true);
        setAnimEndIndex(1); // Start from 1 point
    };

    // Animation loop using requestAnimationFrame for smoothness or setInterval
    useEffect(() => {
        if (!isRiding) {
            setAnimEndIndex(data?.length || 0);
            return;
        }

        if (animEndIndex >= data.length) {
            setIsRiding(false);
            return;
        }

        const timeout = setTimeout(() => {
            // Speed up as dataset gets larger to keep total time reasonable
            const step = Math.max(1, Math.floor(data.length / 100));
            setAnimEndIndex(prev => Math.min(prev + step, data.length));
        }, 16); // ~60fps

        return () => clearTimeout(timeout);
    }, [isRiding, animEndIndex, data]);

    const events = useMemo(() => detectEvents(data), [data]);
    const { peakIdx, troughIdx } = useMemo(() => findPeakAndTrough(data), [data]);

    const initialPrice = avgPrice || data[data.length > 0 ? 0 : 0]?.close;

    // Merge Data for Comparison
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const eventMap = new Map();
        events.forEach(e => eventMap.set(e.date, e.type));
        if (data[peakIdx]) eventMap.set(data[peakIdx].date, 'peak');
        if (data[troughIdx]) eventMap.set(data[troughIdx].date, 'trough');
        eventMap.set(data[0].date, eventMap.get(data[0].date) || 'start');
        eventMap.set(data[data.length - 1].date, eventMap.get(data[data.length - 1].date) || 'end');

        // Create Comparison Map
        const compMap = new Map();
        if (comparisonData) {
            comparisonData.forEach(c => compMap.set(c.date, c.close));
        }

        // Slice for animation
        const slicedData = data.slice(0, animEndIndex);

        return slicedData.map(d => ({
            ...d,
            _event: eventMap.get(d.date) || null,
            aboveLine: d.close >= initialPrice ? d.close : initialPrice,
            belowLine: d.close < initialPrice ? d.close : initialPrice,
            compClose: compMap.get(d.date) || null,
            totalDataLength: data.length,
        }));
    }, [data, events, peakIdx, troughIdx, initialPrice, comparisonData, animEndIndex]);

    const dropCount = events.filter(e => e.type === 'drop').length;
    const loopCount = events.filter(e => e.type === 'loop').length;

    const [selectedEvent, setSelectedEvent] = useState(null);

    const handleEventClick = (eventData) => {
        setSelectedEvent(eventData);
    };

    if (!data || data.length === 0) return null;

    return (
        <div className="w-full relative group">
            {/* Replay Button Overlay */}
            <button
                onClick={handleReplay}
                className="absolute top-2 right-2 z-20 p-2 bg-slate-800/80 backdrop-blur rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-xs font-bold border border-slate-700/50"
            >
                {isRiding ? <Play className="w-3 h-3 animate-pulse" /> : <RotateCcw className="w-3 h-3" />}
                {t('replayRide')}
            </button>

            <div className="w-full h-[420px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 35, right: 15, left: 5, bottom: 5 }}
                    >
                        <defs>
                            <linearGradient id="gradientGain" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="gradientLoss" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                            </linearGradient>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#475569"
                            tick={{ fontSize: 11 }}
                            tickFormatter={(str) => {
                                const d = new Date(str);
                                return `${d.getFullYear().toString().slice(2)}.${d.getMonth() + 1}`;
                            }}
                            minTickGap={40}
                            axisLine={{ stroke: '#1e293b' }}
                        />
                        <YAxis
                            yAxisId="left"
                            stroke="#475569"
                            tick={{ fontSize: 11 }}
                            domain={['auto', 'auto']}
                            tickFormatter={(val) => `$${val.toFixed(0)}`}
                            axisLine={{ stroke: '#1e293b' }}
                        />
                        {/* Comparison Y-Axis */}
                        {comparisonTicker && (
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                stroke="#8b5cf6"
                                tick={{ fontSize: 11, fill: '#a78bfa' }}
                                domain={['auto', 'auto']}
                                tickFormatter={(val) => `$${val.toFixed(0)}`}
                                axisLine={{ stroke: '#4c1d95' }}
                            />
                        )}

                        <Tooltip content={<CustomTooltip ticker={ticker} />} />

                        <ReferenceLine
                            yAxisId="left"
                            y={initialPrice}
                            stroke="#fbbf24"
                            strokeDasharray="6 4"
                            strokeWidth={1.5}
                            label={{ value: `${t('buyPriceLabel')} $${initialPrice.toFixed(2)}`, position: 'insideTopRight', fill: '#fbbf24', fontSize: 11, fontWeight: 'bold' }}
                        />

                        {/* Comparison Line */}
                        {comparisonTicker && (
                            <Area
                                yAxisId="right"
                                type="monotone"
                                dataKey="compClose"
                                stroke="#8b5cf6"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                fillOpacity={0}
                                fill="none"
                                animationDuration={0} // Controlled by parent state slice
                                dot={false}
                                activeDot={{ r: 4, stroke: '#8b5cf6', fill: '#4c1d95' }}
                                name={comparisonTicker}
                            />
                        )}

                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="aboveLine"
                            stroke="none"
                            fillOpacity={1}
                            fill="url(#gradientGain)"
                            animationDuration={0}
                            baseValue={initialPrice}
                            dot={false}
                            activeDot={false}
                        />
                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="belowLine"
                            stroke="none"
                            fillOpacity={1}
                            fill="url(#gradientLoss)"
                            animationDuration={0}
                            baseValue={initialPrice}
                            dot={false}
                            activeDot={false}
                        />
                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="close"
                            stroke="#22d3ee"
                            strokeWidth={3}
                            fillOpacity={0}
                            fill="none"
                            filter="url(#glow)"
                            animationDuration={0} // Manual animation via state slice
                            dot={<CustomDot ticker={ticker} onEventClick={handleEventClick} />}
                            activeDot={{ r: 6, stroke: '#22d3ee', strokeWidth: 2, fill: '#0f172a' }}
                            name={ticker}
                        />
                        <Brush
                            dataKey="date"
                            height={30}
                            stroke="#22d3ee"
                            fill="#1e293b"
                            tickFormatter={(date) => {
                                const d = new Date(date);
                                return `${d.getMonth() + 1}/${d.getDate()}`;
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>

                {/* Event Info Panel Overlay */}
                {selectedEvent && (
                    <div className="absolute bottom-0 left-0 w-full z-30">
                        <EventInfoPanel
                            event={selectedEvent}
                            ticker={ticker}
                            onClose={() => setSelectedEvent(null)}
                        />
                    </div>
                )}
            </div>

            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> 😱 {t('legendDrop')} ({dropCount})</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> 🚀 {t('legendLoop')} ({loopCount})</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span> 🏔️ {t('legendPeak')}</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> 🕳️ {t('legendTrough')}</span>
                <span className="flex items-center gap-1 text-yellow-500">--- {t('legendBuyPrice')}</span>
                {comparisonTicker && (
                    <span className="flex items-center gap-1 text-violet-400 font-bold border border-violet-500/30 px-1.5 rounded bg-violet-500/10">--- VS {comparisonTicker}</span>
                )}
            </div>
        </div>
    );
};

export default RollercoasterChart;
