import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-sans antialiased">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <Link to="/" className="text-cyan-400 text-sm hover:underline mb-8 inline-block">&larr; 홈으로 돌아가기</Link>
                <h1 className="text-3xl font-black text-white mb-2">개인정보처리방침</h1>
                <p className="text-slate-500 text-sm mb-8">Privacy Policy · 최종 수정일: 2026년 2월 14일</p>

                <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-400 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">1. 개인정보의 수집 및 이용 목적</h2>
                        <p>Stock Volatility Rollercoaster(이하 "본 서비스")는 서비스 제공 및 개선을 위해 최소한의 개인정보를 수집할 수 있습니다. 수집된 정보는 다음의 목적으로만 사용됩니다:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>서비스 이용에 관한 통계 분석 및 서비스 품질 개선</li>
                            <li>사용자 문의에 대한 응대 및 처리</li>
                            <li>법적 의무 이행 및 분쟁 해결</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">2. 수집하는 개인정보 항목</h2>
                        <p>본 서비스는 회원가입 절차를 요구하지 않으며, 사용자가 입력하는 종목 코드 및 날짜 정보는 서버에 저장되지 않고 브라우저의 로컬 스토리지(Local Storage)에만 캐시됩니다. 자동으로 수집될 수 있는 정보는 다음과 같습니다:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>IP 주소, 브라우저 유형, 접속 시간 등 서버 로그 정보</li>
                            <li>쿠키(Cookie)를 통한 사용 환경 정보 (광고 제공 목적 포함)</li>
                            <li>Google Analytics 등 제3자 분석 도구를 통한 서비스 이용 패턴 정보</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">3. 개인정보의 보유 및 이용 기간</h2>
                        <p>수집된 개인정보는 수집 목적이 달성된 후 지체 없이 파기합니다. 다만, 관련 법령에 의해 보관이 필요한 경우에는 해당 법령에서 정한 기간 동안 보관합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">4. 개인정보의 제3자 제공</h2>
                        <p>본 서비스는 원칙적으로 사용자의 개인정보를 외부에 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>사용자가 사전에 동의한 경우</li>
                            <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">5. 광고 및 쿠키(Cookie) 운영</h2>
                        <p>본 서비스는 Google AdSense를 통해 광고를 게재할 수 있으며, 이 과정에서 쿠키가 사용될 수 있습니다. Google의 광고 쿠키 사용에 대한 자세한 내용은 <a href="https://policies.google.com/technologies/ads" className="text-cyan-400 hover:underline" target="_blank" rel="noopener noreferrer">Google 광고 정책</a>을 참조하시기 바랍니다. 사용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 서비스 이용에 일부 제한이 생길 수 있습니다.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">6. 개인정보 보호 책임자</h2>
                        <p>개인정보 처리에 관한 문의사항이 있으시면 아래 연락처로 문의해 주시기 바랍니다.</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>이메일: contact@stock-rollercoaster.com</li>
                            <li><Link to="/contact" className="text-cyan-400 hover:underline">문의하기 페이지</Link>를 통해서도 연락하실 수 있습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">7. 개인정보처리방침의 변경</h2>
                        <p>본 개인정보처리방침은 관련 법률, 지침 또는 서비스 변경에 따라 수정될 수 있으며, 변경 사항은 본 페이지를 통해 공지합니다. 본 방침은 2026년 2월 14일부터 시행됩니다.</p>
                    </section>
                </div>

                <div className="mt-12 pt-6 border-t border-slate-800 text-xs text-slate-600">
                    &copy; 2026 Stock Volatility Rollercoaster. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
