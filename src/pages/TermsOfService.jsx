import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-sans antialiased">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <Link to="/" className="text-cyan-400 text-sm hover:underline mb-8 inline-block">&larr; 홈으로 돌아가기</Link>
                <h1 className="text-3xl font-black text-white mb-2">이용약관</h1>
                <p className="text-slate-500 text-sm mb-8">Terms of Service · 최종 수정일: 2026년 2월 14일</p>

                <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-400 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">제1조 (목적)</h2>
                        <p>본 약관은 Stock Volatility Rollercoaster(이하 "서비스")가 제공하는 주식 변동성 시각화 및 분석 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임 사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">제2조 (정의)</h2>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>"서비스"</strong>란 사용자가 입력한 주식 종목 코드와 날짜를 기반으로 주가 변동성을 롤러코스터 형태로 시각화하고, 관련 분석 결과를 제공하는 웹 애플리케이션을 의미합니다.</li>
                            <li><strong>"이용자"</strong>란 본 약관에 따라 서비스를 이용하는 모든 자를 의미합니다.</li>
                            <li><strong>"콘텐츠"</strong>란 서비스 내에서 제공되는 모든 텍스트, 차트, 이미지, 뱃지 등의 정보를 의미합니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">제3조 (약관의 효력 및 변경)</h2>
                        <p>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다. 서비스는 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경된 약관은 본 페이지를 통해 공지합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">제4조 (서비스의 제공)</h2>
                        <p>서비스는 다음의 기능을 제공합니다:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>주식 종목의 과거 주가 데이터를 기반으로 한 변동성 시각화(롤러코스터 차트)</li>
                            <li>투자 수익률, 생존율, 최대 낙폭(MDD) 등 분석 지표 제공</li>
                            <li>다른 종목 또는 시장 지수와의 비교 기능</li>
                            <li>뱃지 시스템을 통한 투자 성과 평가</li>
                            <li>친구 대결 모드를 통한 수익률 비교</li>
                            <li>결과 이미지 저장 및 공유 기능</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">제5조 (면책 조항)</h2>
                        <p>본 서비스에서 제공하는 모든 정보는 오직 <strong>정보 제공 및 엔터테인먼트 목적</strong>으로만 제공됩니다. 본 서비스는 다음 사항에 대해 책임을 지지 않습니다:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>서비스에서 제공하는 정보의 정확성, 완전성 또는 적시성에 대한 보장</li>
                            <li>서비스 이용으로 인한 직접적, 간접적, 부수적, 결과적 또는 특별한 손해</li>
                            <li>이용자의 투자 결정으로 인해 발생하는 금전적 손실</li>
                            <li>제3자 API(주가 데이터 제공자)의 오류 또는 서비스 중단</li>
                        </ul>
                        <p className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 text-xs"><strong>⚠️ 투자 권유가 아닙니다:</strong> 본 서비스의 어떠한 내용도 특정 증권의 매수, 매도 또는 보유를 권유하거나 추천하는 것이 아닙니다. 모든 투자 결정은 이용자 본인의 판단과 책임 하에 이루어져야 합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">제6조 (지적 재산권)</h2>
                        <p>서비스에서 제공하는 콘텐츠(차트, 뱃지, 디자인, 텍스트 등)의 지적 재산권은 서비스 제공자에게 있습니다. 이용자는 서비스가 제공하는 공유 기능을 통해 개인적 용도로 결과물을 공유할 수 있으나, 상업적 목적으로 무단 복제·배포하는 것은 금지됩니다.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">제7조 (이용자의 의무)</h2>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>이용자는 서비스를 이용함에 있어 관련 법령 및 본 약관의 규정을 준수해야 합니다.</li>
                            <li>서비스의 정상적인 운영을 방해하는 행위(과도한 API 호출, 크롤링, 해킹 시도 등)를 해서는 안 됩니다.</li>
                            <li>타인의 개인정보를 침해하거나 명예를 훼손하는 행위를 해서는 안 됩니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">제8조 (준거법 및 관할)</h2>
                        <p>본 약관의 해석 및 적용에 있어서는 대한민국 법률을 따르며, 서비스 이용과 관련한 분쟁에 대해서는 관할 법원에 소를 제기합니다.</p>
                    </section>

                    <section>
                        <p className="mt-6 text-slate-500 text-xs">본 약관은 2026년 2월 14일부터 시행됩니다.</p>
                    </section>
                </div>

                <div className="mt-12 pt-6 border-t border-slate-800 text-xs text-slate-600">
                    &copy; 2026 Stock Volatility Rollercoaster. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
