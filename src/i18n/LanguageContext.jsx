import React, { createContext, useContext, useState, useCallback } from 'react';

const translations = {
    ko: {
        // Header
        headerTitle1: '주식 변동성',
        headerTitle2: '롤러코스터',
        headerDesc1: '당신의 투자는 스릴 넘치는 놀이기구였나, 공포의 자유낙하였나?',
        headerDesc2: '포트폴리오의 G-Force를 측정하세요.',

        // InputSection
        readyToRide: '🎢 탑승 준비',
        readyToRideDesc: '당신의 주식 롤러코스터를 체험하세요',
        popularTickers: '인기 종목',
        tickerLabel: '종목 코드 (Ticker)',
        dateLabel: '탑승일 (매수 날짜)',

        // Battle Mode
        battleChallenger: 'CHALLENGER',
        battleBannerMsg: (name) => `${name}님이 도전장을 보냈습니다!`,
        battleBannerDesc: '수익률',
        battleTarget: '목표',
        battleChallengeFriend: '⚔️ 친구에게 도전장 보내기',
        battleLinkCopied: '링크 복사 완료!',
        battleWin: '🏆 승리! (친구보다 높음)',
        battleLose: '💀 패배... (친구보다 낮음)',
        battleVs: 'VS 친구',
        advancedOpen: '고급 옵션 펼치기',
        advancedClose: '고급 옵션 접기',
        avgPriceLabel: '평균 매수가 (선택)',
        avgPricePlaceholder: '예: 242.50',
        avgPriceHint: '미입력 시 첫 거래일 종가 기준',
        quantityLabel: '보유 수량 (선택)',
        quantityPlaceholder: '예: 10',
        quantityHint: '입력하면 실제 손익 금액도 표시됩니다',
        clearCache: '캐시 데이터 초기화',
        rideNow: '🎢 탑승하기',
        loading: '롤러코스터 준비 중...',
        tryAnother: '🔄 다른 종목 체험하기',

        // Advanced Features
        comparisonLabel: 'VS 비교 종목 (선택)',
        comparisonPlaceholder: '예: NVDA',
        comparisonToggle: '종목 비교하기',
        replayRide: '🎢 다시 타기',
        searchNews: '📰 뉴스 검색',
        whyLabel: '왜?',

        // Phase 2 Features
        ticketAdmitOne: 'ADMIT ONE',
        ticketNumber: 'NO. 8282',
        survivalRate: '🧟 존버 생존율',
        survivalDesc: '전체 기간 중 수익권이었던 날의 비율',
        vsSPY: '🇺🇸 S&P 500 비교',
        vsQQQ: '🇺🇸 나스닥 비교',

        // Phase 3 Features
        badgeHodlGod: '존버의 신',
        badgeHodlGodMsg: '1년 이상 버티고 승리하셨군요!',
        badgeProfitMaster: '익절 장인',
        badgeProfitMasterMsg: '20% 이상 수익! 축하합니다.',
        badgeSurvivor: '생존자',
        badgeSurvivorMsg: '-30%를 견딘 강철 멘탈',
        badgeBeastHeart: '야수의 심장',
        badgeBeastHeartMsg: '-50%를 견딘... 당신은...',
        watermarkText: 'stock-rollercoaster.com 에서 내 주식 확인하기',

        // Phase 4 - New Badges
        badgeMoneyPrinter: '돈복사기',
        badgeMoneyPrinterMsg: '수익률 +100% 돌파! 실화입니까?',
        badgeDiamondHands: '다이아몬드 핸즈',
        badgeDiamondHandsMsg: '-40%를 견디고 수익 전환! 레전드.',
        badgeNirvana: '해탈',
        badgeNirvanaMsg: '-50%... 1년... 득도하셨습니다.',
        badgeLuckyShot: '초심자의 행운',
        badgeLuckyShotMsg: '시작이 좋네요! (1개월 미만)',
        badgeAmbulance: '구조대 시급',
        badgeAmbulanceMsg: '-70%... 거기 누구 없나요?',

        // Phase 7 - New Badges
        badgePaperHands: '페이퍼 핸즈',
        badgePaperHandsMsg: '7일도 안 되서 손절... 인내심 제로',
        badgeYoloKing: 'YOLO 킹',
        badgeYoloKingMsg: 'MDD -60% 넘과 후 +50% 수익! 미친거 아니야?',
        badgeSidewaysSurfer: '횟보 서퍼',
        badgeSidewaysSurferMsg: '3개월 기다렸는데 달라진 것이 없다',
        badgeRocketMan: '로켓맨',
        badgeRocketManMsg: '+200% 돌파! 우주까지 걸어서 간다',
        badgeBuyTheDip: '딥매수 챔피언',
        badgeBuyTheDipMsg: '-30% 찍어먹고 +50% 수익! 신의 매수 타이밍',
        badgeSpeedRunner: '스피드러너',
        badgeSpeedRunnerMsg: '2주 안에 +30% 달성! 플래시 트레이더?',
        badgeFrozenAccount: '냉동 계좌',
        badgeFrozenAccountMsg: '1000일 이상 보유... 비밀번호 기억나?',
        badgeEmotionalDamage: '정신적 피해',
        badgeEmotionalDamageMsg: 'MDD -40% + 손실... 멘탈 괜찮으세요?',
        badgeWarVeteran: '전쟁 용사',
        badgeWarVeteranMsg: '2년 이상 버티고 수익! 존경합니다 선배님',
        badgePennyWise: '페니 와이즈',
        badgePennyWiseMsg: '수익률 0~1%... 차라리 예금을...',
        badgeFreeFall: '자유낙하',
        badgeFreeFallMsg: '-90% 이상 손실... 더 이상 말을 잇었다',
        badgePhoenix: '불사조',
        badgePhoenixMsg: 'MDD -50% 지옥에서 부활! +20% 수익 전환',

        // Badge Collection
        badgeCollection: '내 뱃지 도감 보기',
        badgeCollectionTitle: '나의 주식 뱃지 도감',
        badgeCollectionDesc: '다양한 투자 경험을 통해 뱃지를 수집해보세요!',
        badgeEarned: '획득 완료',
        badgeLocked: '미획득',

        // Date Presets
        preset1m: '1개월',
        preset3m: '3개월',
        preset6m: '6개월',
        preset1y: '1년',
        preset2y: '2년',
        preset3y: '3년',
        preset5y: '5년',
        presetYTD: '올해',

        // ResultCard
        rideReport: '탑승 완료',
        maxGForce: 'Max G-Force',
        rideDuration: '탑승 시간',
        dropCount: '급락 횟수',
        loopCount: '급등 횟수',
        dropDesc: '😱 수직 낙하',
        loopDesc: '🚀 빅토리 루프',
        days: '일',
        investmentPerformance: '💰 실제 투자 성과',
        investmentAmount: '투자 원금',
        currentValue: '현재 가치',
        pnl: '손익',
        avgPriceNote: '📌 평균 매수가 기준',
        currentPriceNote: '현재가',
        shareButton: '🖼️ 이미지 저장',
        capturing: '저장 중...',
        shares: '주',

        // Chart legend
        legendDrop: '급락',
        legendLoop: '급등',
        legendPeak: '최고가',
        legendTrough: '최저가',
        legendBuyPrice: '매수가',
        buyPriceLabel: '매수가',

        // Ride Grades
        // Ride Grades (Legacy + New)
        gradeRocket: '천국행 로켓',
        gradeRocketDesc: '중력을 거스르는 수익률 200% 폭등!',
        gradeBungee: '줄 없는 번지점프',
        gradeBungeeDesc: '낙하산도 없이 -70% 수직 낙하',
        gradeHellTrain: '지옥행 급행열차',
        gradeHellTrainDesc: '돌아올 수 없는 강을 건넜습니다',
        gradeTExpress: 'T-익스프레스급',
        gradeTExpressDesc: '강철 심장만 생존 가능한 -40% 급락',
        gradeDonor: '월가 기부천사',
        gradeDonorDesc: '당신의 돈은 좋은 곳에 쓰일 겁니다',
        gradeMerryGoRound: '회전목마급',
        gradeMerryGoRoundDesc: '평화롭고 지루한 횡보장',

        gradeBlackHole: '블랙홀 급',
        gradeBlackHoleDesc: '이건 투자가 아니라 도박이었다',
        gradeGyroDrop: '자이로드롭급',
        gradeGyroDropDesc: '심장이 쫄깃한 하락',
        gradeMegaStorm: '메가스톰급',
        gradeMegaStormDesc: '좀 흔들렸지만 견딜 만함',
        gradeKiddy: '어린이 열차',
        gradeKiddyDesc: '안전하고 편안한 투자',

        // Phase 7.5 - New Grades
        gradeUnicorn: '유니콘 익스프레스',
        gradeUnicornDesc: '+100% 수익에 MDD도 낮은 전설의 라이드',
        gradeDiamondCoaster: '다이아먼드 코스터',
        gradeDiamondCoasterDesc: '+100% 수익이지만 콰코스터를 타고 왔다',
        gradeZombie: '좀비 아포칼립스',
        gradeZombieDesc: 'MDD -60% 넘고 손실 -50%... 말이 필요없다',
        gradePirateShip: '해적선',
        gradePirateShipDesc: 'MDD -40% 급락에 손실까지... 해적에게 털린 기분',
        gradeGhostShip: '유령선',
        gradeGhostShipDesc: '조용히 가라앉는 계좌... 무서운 손실',
        gradeSuperman: '슈퍼맨',
        gradeSupermanDesc: '+50% 수익을 낮은 MDD로 달성! 천재 투자자',
        gradeTsunami: '취나미',
        gradeTsunamiDesc: 'MDD -30%의 파도를 넘고 수익 달성!',
        gradeVikingShip: '바이킹선',
        gradeVikingShipDesc: '출렌거렸지만 그러저러 버텀 라이드',
        gradeWavePool: '파도 풀',
        gradeWavePoolDesc: '적당한 뒤흘림과 함께 수익 달성',
        gradeLazyRiver: '레이지 리버',
        gradeLazyRiverDesc: '느긋하게 흐르면서 꼽꼽한 수익',

        // Fact bombs
        factReturn100: '🚀 수익률 100% 돌파! 당신은 전설의 투자자입니다.',
        factReturn50: '💎 다이아몬드 핸드! 50% 이상 수익을 거뒀습니다.',
        factReturnPositive: '✅ 플러스 수익! 나쁘지 않은 라이딩이었습니다.',
        factLossSmall: '😅 약간의 손실... 아직 희망은 있습니다.',
        factLossMedium: '😱 상당한 손실을 견뎌낸 당신, 강철 멘탈 인증.',
        factLossHuge: '💀 반토막 이상... 고통의 롤러코스터를 완주하셨습니다.',
        factMDD40: (pct) => `⚡ 최대 낙폭 ${pct}%의 중력가속도를 견뎌낸 당신, 진정한 강철 심장!`,
        factHold2y: '🫡 2년 이상 홀딩! 인내심의 끝판왕입니다.',
        factHold1y: '⏰ 1년 이상 장기 투자자! 존경합니다.',

        // ResultCard conditions
        deathDrop: 'You survived a death drop! 💀',
        kiddyRide: 'Just a kiddy ride. 👶',
        longHauler: 'Long hauler! Respect. 🫡',
        shortSweet: 'Short and sweet? 🤔',

        // Footer
        footer: 'Stock Volatility Rollercoaster',
    },
    en: {
        headerTitle1: 'Stock Volatility',
        headerTitle2: 'Rollercoaster',
        headerDesc1: 'Was your investment a thrill ride or a horror show?',
        headerDesc2: 'Measure the G-Force of your portfolio.',

        readyToRide: '🎢 Ready to Ride',
        readyToRideDesc: 'Experience your stock rollercoaster',
        popularTickers: 'Popular',
        tickerLabel: 'Stock Ticker',
        dateLabel: 'Boarding Date (Buy Date)',

        // Battle Mode
        battleChallenger: 'CHALLENGER',
        battleBannerMsg: (name) => `${name} sent a challenge!`,
        battleBannerDesc: 'Return',
        battleTarget: 'TARGET',
        battleChallengeFriend: '⚔️ Challenge a Friend',
        battleLinkCopied: 'Link Copied!',
        battleWin: '🏆 WIN! (You beat them)',
        battleLose: '💀 LOSE... (Try again)',
        battleVs: 'VS Friend',
        advancedOpen: 'Advanced Options',
        advancedClose: 'Hide Options',
        avgPriceLabel: 'Avg Purchase Price (optional)',
        avgPricePlaceholder: 'e.g. 242.50',
        avgPriceHint: 'Defaults to first trading day close',
        quantityLabel: 'Shares Held (optional)',
        quantityPlaceholder: 'e.g. 10',
        quantityHint: 'Enter to see actual P&L amounts',
        clearCache: 'Clear Cached Data',
        rideNow: '🎢 RIDE NOW',
        loading: 'Prepping Coaster...',
        tryAnother: '🔄 Try Another Ride',

        comparisonLabel: 'VS Compare Ticker (optional)',
        comparisonPlaceholder: 'e.g. NVDA',
        comparisonToggle: 'Compare Stock',
        replayRide: '🎢 Replay Ride',
        searchNews: '📰 Search News',
        whyLabel: 'Why?',

        ticketAdmitOne: 'ADMIT ONE',
        ticketNumber: 'NO. 8282',
        survivalRate: '🧟 Survival Rate',
        survivalDesc: '% of days where you were in profit',
        vsSPY: '🇺🇸 VS S&P 500',
        vsQQQ: '🇺🇸 VS NASDAQ',

        badgeHodlGod: 'God of HODL',
        badgeHodlGodMsg: 'Held for >1yr and won!',
        badgeProfitMaster: 'Profit Master',
        badgeProfitMasterMsg: '>20% Profit! Congrats.',
        badgeSurvivor: 'Survivor',
        badgeSurvivorMsg: 'Survived -30% drop.',
        badgeBeastHeart: 'Beast Heart',
        badgeBeastHeartMsg: 'Endured -50% drop...',
        watermarkText: 'Check your volatility at stock-rollercoaster.com',

        // Phase 4 - New Badges
        badgeMoneyPrinter: 'Money Printer',
        badgeMoneyPrinterMsg: '+100% Return! Unreal!',
        badgeDiamondHands: 'Diamond Hands',
        badgeDiamondHandsMsg: 'Endured -40% & Won!',
        badgeNirvana: 'Nirvana',
        badgeNirvanaMsg: '-50%... 1 year... Zen.',
        badgeLuckyShot: 'Lucky Shot',
        badgeLuckyShotMsg: 'Great start! (<1 mo)',
        badgeAmbulance: 'Call Ambulance',
        badgeAmbulanceMsg: '-70%... Anyone there?',

        // Phase 7 - New Badges
        badgePaperHands: 'Paper Hands',
        badgePaperHandsMsg: 'Sold in < 7 days at a loss...',
        badgeYoloKing: 'YOLO King',
        badgeYoloKingMsg: 'MDD -60% then +50% profit! Insane!',
        badgeSidewaysSurfer: 'Sideways Surfer',
        badgeSidewaysSurferMsg: '90+ days and absolutely nothing happened',
        badgeRocketMan: 'Rocket Man',
        badgeRocketManMsg: '+200%! To the moon! 🌙',
        badgeBuyTheDip: 'Buy the Dip Champ',
        badgeBuyTheDipMsg: 'Ate the -30% dip and came back +50%!',
        badgeSpeedRunner: 'Speed Runner',
        badgeSpeedRunnerMsg: '+30% in under 2 weeks! Flash trader?',
        badgeFrozenAccount: 'Frozen Account',
        badgeFrozenAccountMsg: 'Held for 1000+ days... remember the password?',
        badgeEmotionalDamage: 'Emotional Damage',
        badgeEmotionalDamageMsg: 'MDD -40% + loss... you ok?',
        badgeWarVeteran: 'War Veteran',
        badgeWarVeteranMsg: '2+ years holding and still profitable. Salute!',
        badgePennyWise: 'Penny Wise',
        badgePennyWiseMsg: '0~1% return... savings account vibes',
        badgeFreeFall: 'Free Fall',
        badgeFreeFallMsg: '-90%+ loss... no words left',
        badgePhoenix: 'Phoenix',
        badgePhoenixMsg: 'Rose from -50% MDD to +20% profit!',

        // Badge Collection
        badgeCollection: 'View Badge Collection',
        badgeCollectionTitle: 'My Badge Collection',
        badgeCollectionDesc: 'Collect badges through your investment journey!',
        badgeEarned: 'Earned',
        badgeLocked: 'Locked',

        preset1m: '1M',
        preset3m: '3M',
        preset6m: '6M',
        preset1y: '1Y',
        preset2y: '2Y',
        preset3y: '3Y',
        preset5y: '5Y',
        presetYTD: 'YTD',

        rideReport: 'RIDE REPORT',
        maxGForce: 'Max G-Force',
        rideDuration: 'Ride Duration',
        dropCount: 'Steep Drops',
        loopCount: 'Victory Loops',
        dropDesc: '😱 Free Fall',
        loopDesc: '🚀 Victory Loop',
        days: 'days',
        investmentPerformance: '💰 Investment Performance',
        investmentAmount: 'Invested',
        currentValue: 'Current Value',
        pnl: 'P&L',
        avgPriceNote: '📌 Based on avg price',
        currentPriceNote: 'Current',
        shareButton: '🖼️ Save Image',
        capturing: 'Capturing...',
        shares: 'shares',

        legendDrop: 'Drop',
        legendLoop: 'Rally',
        legendPeak: 'Peak',
        legendTrough: 'Trough',
        legendBuyPrice: 'Buy Price',
        buyPriceLabel: 'Buy Price',

        // Ride Grades (Legacy + New)
        gradeRocket: 'Rocket to Heaven',
        gradeRocketDesc: 'Defying gravity! +200%',
        gradeBungee: 'No-Rope Bungee',
        gradeBungeeDesc: '-70% Free fall without chute',
        gradeHellTrain: 'Hell Train',
        gradeHellTrainDesc: 'Crossed the point of no return',
        gradeTExpress: 'T-Express Class',
        gradeTExpressDesc: 'Only steel hearts survive -40%',
        gradeDonor: 'Wall St Donor',
        gradeDonorDesc: 'Your money went to a "good" cause',
        gradeMerryGoRound: 'Merry-Go-Round',
        gradeMerryGoRoundDesc: 'Peaceful and boring',

        gradeBlackHole: 'Black Hole',
        gradeBlackHoleDesc: 'Gambling, not investing',
        gradeGyroDrop: 'Gyro Drop',
        gradeGyroDropDesc: 'Heart-pounding drop',
        gradeMegaStorm: 'Mega Storm',
        gradeMegaStormDesc: 'Shaky but manageable',
        gradeKiddy: 'Kiddy Ride',
        gradeKiddyDesc: 'Safe and comfy',

        // Phase 7.5 - New Grades
        gradeUnicorn: 'Unicorn Express',
        gradeUnicornDesc: '+100% with low MDD — the dream ride',
        gradeDiamondCoaster: 'Diamond Coaster',
        gradeDiamondCoasterDesc: '+100% but what a wild ride!',
        gradeZombie: 'Zombie Apocalypse',
        gradeZombieDesc: 'MDD -60% and -50% loss... RIP',
        gradePirateShip: 'Pirate Ship',
        gradePirateShipDesc: '-40% MDD and still losing... plundered',
        gradeGhostShip: 'Ghost Ship',
        gradeGhostShipDesc: 'Slowly sinking... spooky losses',
        gradeSuperman: 'Superman Ride',
        gradeSupermanDesc: '+50% with low MDD! Genius investor',
        gradeTsunami: 'Tsunami Ride',
        gradeTsunamiDesc: 'Survived -30% MDD waves and profited!',
        gradeVikingShip: 'Viking Ship',
        gradeVikingShipDesc: 'Bumpy ride but held together',
        gradeWavePool: 'Wave Pool',
        gradeWavePoolDesc: 'Moderate waves, moderate gains',
        gradeLazyRiver: 'Lazy River',
        gradeLazyRiverDesc: 'Smooth sailing with steady returns',

        factReturn100: '🚀 100%+ return! You are a legendary investor.',
        factReturn50: '💎 Diamond hands! 50%+ gains secured.',
        factReturnPositive: '✅ Positive return! Not a bad ride.',
        factLossSmall: '😅 Minor losses... there\'s still hope.',
        factLossMedium: '😱 Endured significant losses. Steel mentality certified.',
        factLossHuge: '💀 Cut in half or worse... You completed the pain coaster.',
        factMDD40: (pct) => `⚡ Survived a ${pct}% max drawdown G-Force. True steel heart!`,
        factHold2y: '🫡 2+ years holding! The ultimate patient investor.',
        factHold1y: '⏰ 1+ year long-term investor! Respect.',

        deathDrop: 'You survived a death drop! 💀',
        kiddyRide: 'Just a kiddy ride. 👶',
        longHauler: 'Long hauler! Respect. 🫡',
        shortSweet: 'Short and sweet? 🤔',

        footer: 'Stock Volatility Rollercoaster',
    }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState('en');

    const t = useCallback((key) => {
        return translations[lang]?.[key] || translations['en']?.[key] || key;
    }, [lang]);

    const toggleLang = useCallback(() => {
        setLang(prev => prev === 'ko' ? 'en' : 'ko');
    }, []);

    return (
        <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLang = () => {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLang must be used within LanguageProvider');
    return ctx;
};

export default translations;
