import React from 'react';
import { Link } from 'react-router-dom';

const Contact = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-sans antialiased">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <Link to="/" className="text-cyan-400 text-sm hover:underline mb-8 inline-block">&larr; 홈으로 돌아가기</Link>
                <h1 className="text-3xl font-black text-white mb-2">문의하기</h1>
                <p className="text-slate-500 text-sm mb-8">Contact Us · 피드백, 제안, 문의사항을 보내주세요.</p>

                <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-400 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">📧 이메일 문의</h2>
                        <p>서비스 이용, 기능 제안, 버그 리포트, 광고 문의 등 모든 종류의 문의는 아래 이메일로 보내주시기 바랍니다.</p>
                        <div className="mt-3 p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl">
                            <p className="text-white font-mono font-bold text-lg">contact@stock-rollercoaster.com</p>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">영업일 기준 1~3일 이내에 답변 드리겠습니다.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">💡 피드백 및 기능 제안</h2>
                        <p>Stock Volatility Rollercoaster를 더 좋은 서비스로 만들기 위한 아이디어가 있으시다면 언제든지 환영합니다. 다음과 같은 피드백을 기다리고 있습니다:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>새로운 기능 아이디어 (예: 새로운 뱃지, 분석 지표 등)</li>
                            <li>UI/UX 개선 제안</li>
                            <li>데이터 관련 요청 (새로운 시장, 지수 추가 등)</li>
                            <li>일반적인 사용 후기</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">🐛 버그 리포트</h2>
                        <p>서비스 이용 중 문제를 발견하셨다면, 다음 정보를 포함하여 이메일로 보내주시면 빠르게 해결하겠습니다:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>사용 중인 브라우저 및 운영체제</li>
                            <li>문제가 발생한 종목 코드 및 날짜</li>
                            <li>에러 메시지 캡처 (있는 경우)</li>
                            <li>문제 재현 절차</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">📢 광고 및 비즈니스 문의</h2>
                        <p>광고 게재, 제휴, 협업 등 비즈니스 관련 문의는 이메일 제목에 <strong>[비즈니스]</strong>를 포함하여 보내주시기 바랍니다.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">⚖️ 법적 문의</h2>
                        <p>저작권, 개인정보보호 등 법적 사안과 관련된 문의는 이메일 제목에 <strong>[법적 문의]</strong>를 포함하여 보내주시기 바랍니다. 관련 문서를 첨부해 주시면 보다 신속하게 처리해 드리겠습니다.</p>
                    </section>
                </div>

                <div className="mt-12 pt-6 border-t border-slate-800 text-xs text-slate-600">
                    &copy; 2026 Stock Volatility Rollercoaster. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default Contact;
