/**
 * 주가 데이터 분석 유틸리티
 */

// 롤러코스터 난이도 등급 시스템
// 롤러코스터 난이도 등급 시스템 (Complex Logic)
export function getRideGrade(maxDrawdown, totalReturn) {
    const mdd = maxDrawdown; // 0.0 ~ 1.0 (positive value representing drop)
    const ret = totalReturn; // percentage

    // 1. 🚀 Rocket to Heaven (천국행 로켓)
    if (ret >= 200) return { grade: 'GOD', nameKey: 'gradeRocket', descKey: 'gradeRocketDesc', emoji: '🚀', color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/50' };

    // 2. 🍂 Bungee Jumping (줄 없는 번지점프) - Worst Case
    if (mdd >= 0.70) return { grade: 'F', nameKey: 'gradeBungee', descKey: 'gradeBungeeDesc', emoji: '🍂', color: 'text-slate-500', bgColor: 'bg-slate-700/20', borderColor: 'border-slate-500/50' };

    // 3. 🔥 Hell Train (지옥행 급행열차)
    if (mdd >= 0.50 && ret <= -30) return { grade: 'D-', nameKey: 'gradeHellTrain', descKey: 'gradeHellTrainDesc', emoji: '🔥', color: 'text-red-600', bgColor: 'bg-red-600/20', borderColor: 'border-red-600/50' };

    // 4. 🐲 T-Express (T-익스프레스)
    if (mdd >= 0.40 && ret > 0) return { grade: 'S', nameKey: 'gradeTExpress', descKey: 'gradeTExpressDesc', emoji: '🎢', color: 'text-rose-400', bgColor: 'bg-rose-400/20', borderColor: 'border-rose-400/50' };

    // 5. 💸 Wall St Donor (월가 기부천사)
    if (ret < -10 && ret >= -30 && mdd < 0.4) return { grade: 'C', nameKey: 'gradeDonor', descKey: 'gradeDonorDesc', emoji: '💸', color: 'text-blue-400', bgColor: 'bg-blue-400/20', borderColor: 'border-blue-400/50' };

    // 6. 🎠 Merry-Go-Round (회전목마)
    if (mdd < 0.15 && Math.abs(ret) < 10) return { grade: 'B', nameKey: 'gradeMerryGoRound', descKey: 'gradeMerryGoRoundDesc', emoji: '🎠', color: 'text-emerald-400', bgColor: 'bg-emerald-400/20', borderColor: 'border-emerald-400/50' };

    // Fallback to basic logic based on MDD if no special case matches
    if (mdd >= 0.50) return { grade: 'A+', nameKey: 'gradeBlackHole', descKey: 'gradeBlackHoleDesc', emoji: '🕳️', color: 'text-red-500', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/50' };
    if (mdd >= 0.30) return { grade: 'A', nameKey: 'gradeGyroDrop', descKey: 'gradeGyroDropDesc', emoji: '🗼', color: 'text-orange-400', bgColor: 'bg-orange-400/20', borderColor: 'border-orange-400/50' };
    if (mdd >= 0.20) return { grade: 'B', nameKey: 'gradeMegaStorm', descKey: 'gradeMegaStormDesc', emoji: '🌊', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20', borderColor: 'border-yellow-400/50' };

    return { grade: 'C', nameKey: 'gradeKiddy', descKey: 'gradeKiddyDesc', emoji: '👶', color: 'text-cyan-400', bgColor: 'bg-cyan-400/20', borderColor: 'border-cyan-400/50' };
}

// MDD(최대낙폭) 계산
export function calculateMaxDrawdown(data) {
    let maxDrawdown = 0;
    let peak = -Infinity;
    let peakDate = '';
    let mddPeakDate = '';
    let mddTroughDate = '';

    data.forEach(d => {
        if (d.close > peak) {
            peak = d.close;
            peakDate = d.date;
        }
        const drawdown = (peak - d.close) / peak;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
            mddPeakDate = peakDate;
            mddTroughDate = d.date;
        }
    });

    return { maxDrawdown, mddPeakDate, mddTroughDate };
}

// 최고가/최저가 찾기
export function findPeakAndTrough(data) {
    let peakIdx = 0;
    let troughIdx = 0;

    data.forEach((d, i) => {
        if (d.close > data[peakIdx].close) peakIdx = i;
        if (d.close < data[troughIdx].close) troughIdx = i;
    });

    return { peakIdx, troughIdx, peak: data[peakIdx], trough: data[troughIdx] };
}

// 이벤트 감지 (5일 윈도우) - 기준 완화
export function detectEvents(data) {
    const events = [];
    const windowSize = 5;

    for (let i = windowSize; i < data.length; i++) {
        const windowStart = data[i - windowSize].close;
        const current = data[i].close;
        const change = ((current - windowStart) / windowStart) * 100;

        // Thresholds relaxed: -5% for drop, +7% for loop
        if (change < -5) {
            const recentDrop = events.find(e => e.type === 'drop' && i - e.index < 10);
            if (!recentDrop) {
                events.push({ type: 'drop', index: i, date: data[i].date, close: data[i].close, change });
            }
        } else if (change > 7) {
            const recentLoop = events.find(e => e.type === 'loop' && i - e.index < 10);
            if (!recentLoop) {
                events.push({ type: 'loop', index: i, date: data[i].date, close: data[i].close, change });
            }
        }
    }

    return events;
}

// 생존율 계산 (Survival Rate)
export function calculateSurvivalRate(data, avgPrice) {
    if (!data || data.length === 0 || !avgPrice) return 0;

    // Count days where close price > avgPrice (Profitable days)
    const survivors = data.filter(d => d.close >= avgPrice).length;
    return (survivors / data.length) * 100;
}

// 보유 기간 변환 (i18n 지원)
export function formatDuration(days, lang = 'ko') {
    if (lang === 'ko') {
        if (days >= 365) {
            const years = Math.floor(days / 365);
            const months = Math.floor((days % 365) / 30);
            return `${years}년 ${months}개월`;
        } else if (days >= 30) {
            const months = Math.floor(days / 30);
            const remainingDays = days % 30;
            return `${months}개월 ${remainingDays}일`;
        }
        return `${days}일`;
    } else {
        if (days >= 365) {
            const years = Math.floor(days / 365);
            const months = Math.floor((days % 365) / 30);
            return `${years}y ${months}m`;
        } else if (days >= 30) {
            const months = Math.floor(days / 30);
            const remainingDays = days % 30;
            return `${months}m ${remainingDays}d`;
        }
        return `${days}d`;
    }
}

// 팩트 폭격 문구 (i18n)
export function getFactBomb(totalReturn, maxDrawdown, durationDays, t) {
    const facts = [];

    if (totalReturn > 100) facts.push(t('factReturn100'));
    else if (totalReturn > 50) facts.push(t('factReturn50'));
    else if (totalReturn > 0) facts.push(t('factReturnPositive'));
    else if (totalReturn > -20) facts.push(t('factLossSmall'));
    else if (totalReturn > -50) facts.push(t('factLossMedium'));
    else facts.push(t('factLossHuge'));

    if (maxDrawdown > 0.4) {
        const fn = t('factMDD40');
        facts.push(typeof fn === 'function' ? fn((maxDrawdown * 100).toFixed(0)) : fn);
    }
    if (durationDays > 365 * 2) facts.push(t('factHold2y'));
    else if (durationDays > 365) facts.push(t('factHold1y'));

    return facts;
}

// 인기 종목
export const POPULAR_TICKERS = [
    { ticker: 'TSLA', name: '테슬라', emoji: '⚡' },
    { ticker: 'AAPL', name: '애플', emoji: '🍎' },
    { ticker: 'NVDA', name: '엔비디아', emoji: '🖥️' },
    { ticker: 'AMZN', name: '아마존', emoji: '📦' },
    { ticker: 'GOOGL', name: '구글', emoji: '🔍' },
    { ticker: 'META', name: '메타', emoji: '👓' },
    { ticker: 'MSFT', name: 'MS', emoji: '🪟' },
];

// 바이럴 뱃지 계산 (Expanded)
export function getBadges(totalReturn, maxDrawdown, durationDays) {
    const badges = [];

    // All Possible Badges Definition for Dictionary
    // We will check conditions and push earned ones. 
    // Usually we might want to return { earned: [], unearned: [] } but for now let's just return earned.
    // ResultCard will use a separate list for the Dictionary if needed, or we export a constant `ALL_BADGES`.

    // 1. 🖨️ Money Printer (돈복사기): +100%
    if (totalReturn >= 100) {
        badges.push({ id: 'moneyPrinter', emoji: '🖨️', nameKey: 'badgeMoneyPrinter', color: 'text-green-400', msgKey: 'badgeMoneyPrinterMsg' });
    }

    // 2. 💎 Diamond Hands (다이아몬드 핸즈): MDD -40% & Profit
    if (maxDrawdown >= 0.4 && totalReturn > 0) {
        badges.push({ id: 'diamondHands', emoji: '💎', nameKey: 'badgeDiamondHands', color: 'text-cyan-300', msgKey: 'badgeDiamondHandsMsg' });
    }

    // 3. 🧘 God of HODL (존버의 신): > 365 days & Profit (Existing)
    if (durationDays >= 365 && totalReturn > 0) {
        badges.push({ id: 'hodlGod', emoji: '🧘', nameKey: 'badgeHodlGod', color: 'text-purple-400', msgKey: 'badgeHodlGodMsg' });
    }

    // 4. 🧘 Nirvana (해탈): > 365 days & Loss -50%
    if (durationDays >= 365 && totalReturn <= -50) {
        badges.push({ id: 'nirvana', emoji: '🧘‍♂️', nameKey: 'badgeNirvana', color: 'text-slate-400', msgKey: 'badgeNirvanaMsg' });
    }

    // 5. 💰 Profit Master (익절 장인): > 20% (Existing)
    if (totalReturn >= 20) {
        badges.push({ id: 'profitMaster', emoji: '💰', nameKey: 'badgeProfitMaster', color: 'text-emerald-400', msgKey: 'badgeProfitMasterMsg' });
    }

    // 6. 🐣 Lucky Shot (초심자의 행운): < 30 days & > 10%
    if (durationDays < 30 && totalReturn >= 10) {
        badges.push({ id: 'luckyShot', emoji: '🐣', nameKey: 'badgeLuckyShot', color: 'text-yellow-300', msgKey: 'badgeLuckyShotMsg' });
    }

    // 7. 🦁 Beast Heart (야수의 심장): MDD > 50% (Existing)
    if (maxDrawdown >= 0.5) {
        badges.push({ id: 'beastHeart', emoji: '🦁', nameKey: 'badgeBeastHeart', color: 'text-rose-500', msgKey: 'badgeBeastHeartMsg' });
    }

    // 8. 🚑 Ambulance (구조대 시급): < -70%
    if (totalReturn <= -70) {
        badges.push({ id: 'ambulance', emoji: '🚑', nameKey: 'badgeAmbulance', color: 'text-red-500', msgKey: 'badgeAmbulanceMsg' });
    }

    // 9. 🏝️ Survivor (생존자): MDD > 30% & Profit (Existing)
    if (maxDrawdown >= 0.3 && totalReturn > 0) {
        badges.push({ id: 'survivor', emoji: '🏝️', nameKey: 'badgeSurvivor', color: 'text-cyan-400', msgKey: 'badgeSurvivorMsg' });
    }

    return badges;
}

// Export all possible badges for Dictionary
export const ALL_BADGES = [
    { id: 'moneyPrinter', emoji: '🖨️', nameKey: 'badgeMoneyPrinter', color: 'text-green-400', msgKey: 'badgeMoneyPrinterMsg' },
    { id: 'diamondHands', emoji: '💎', nameKey: 'badgeDiamondHands', color: 'text-cyan-300', msgKey: 'badgeDiamondHandsMsg' },
    { id: 'hodlGod', emoji: '🧘', nameKey: 'badgeHodlGod', color: 'text-purple-400', msgKey: 'badgeHodlGodMsg' },
    { id: 'nirvana', emoji: '🧘‍♂️', nameKey: 'badgeNirvana', color: 'text-slate-400', msgKey: 'badgeNirvanaMsg' },
    { id: 'profitMaster', emoji: '💰', nameKey: 'badgeProfitMaster', color: 'text-emerald-400', msgKey: 'badgeProfitMasterMsg' },
    { id: 'luckyShot', emoji: '🐣', nameKey: 'badgeLuckyShot', color: 'text-yellow-300', msgKey: 'badgeLuckyShotMsg' },
    { id: 'beastHeart', emoji: '🦁', nameKey: 'badgeBeastHeart', color: 'text-rose-500', msgKey: 'badgeBeastHeartMsg' },
    { id: 'ambulance', emoji: '🚑', nameKey: 'badgeAmbulance', color: 'text-red-500', msgKey: 'badgeAmbulanceMsg' },
    { id: 'survivor', emoji: '🏝️', nameKey: 'badgeSurvivor', color: 'text-cyan-400', msgKey: 'badgeSurvivorMsg' },
];
