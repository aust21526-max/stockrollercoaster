import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-sans antialiased">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <Link to="/" className="text-cyan-400 text-sm hover:underline mb-8 inline-block">&larr; Back to Home</Link>
                <h1 className="text-3xl font-black text-white mb-2">Terms of Service</h1>
                <p className="text-slate-500 text-sm mb-8">Terms of Service · Last Updated: February 14, 2026</p>

                <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-400 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">Article 1 (Purpose)</h2>
                        <p>These Terms and Conditions aim to regulate the conditions and procedures for using the stock volatility visualization and analysis service provided by Stock Volatility Rollercoaster (hereinafter "Service"), as well as the rights, obligations, and responsibilities of the users and the Service.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">Article 2 (Definitions)</h2>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>"Service"</strong> refers to the web application that visualizes stock price volatility in the form of a rollercoaster based on the stock ticker and date entered by the user, and provides related analysis results.</li>
                            <li><strong>"User"</strong> refers to any person who uses the Service in accordance with these Terms.</li>
                            <li><strong>"Content"</strong> refers to all information such as text, charts, images, badges, etc., provided within the Service.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">Article 3 (Effect and Change of Terms)</h2>
                        <p>These Terms become effective by being posted on the service screen or by other means of notification to the user. The Service may change these Terms to the extent that they do not violate relevant laws, and the changed Terms will be announced on this page.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">Article 4 (Provision of Service)</h2>
                        <p>The Service provides the following features:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Volatility visualization (rollercoaster chart) based on historical stock price data</li>
                            <li>Analysis metrics such as return on investment, survival rate, Maximum Drawdown (MDD), etc.</li>
                            <li>Comparison features with other stocks or market indices</li>
                            <li>Investment performance evaluation through a badge system</li>
                            <li>Return rate comparison through Friend Battle Mode</li>
                            <li>Result image saving and sharing features</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">Article 5 (Disclaimer)</h2>
                        <p>All information provided by this Service is for <strong>informational and entertainment purposes only</strong>. The Service is not responsible for:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Grouping the accuracy, completeness, or timeliness of the information provided by the Service</li>
                            <li>Direct, indirect, incidental, consequential, or special damages resulting from the use of the Service</li>
                            <li>Financial losses incurred by the user's investment decisions</li>
                            <li>Errors or service interruptions of third-party APIs (stock price data providers)</li>
                        </ul>
                        <p className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-300 text-xs"><strong>⚠️ Not Investment Advice:</strong> Nothing in this Service constitutes a recommendation or solicitation to buy, sell, or hold any specific securities. All investment decisions are the sole responsibility of the user.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">Article 6 (Intellectual Property Rights)</h2>
                        <p>The intellectual property rights of the content (charts, badges, designs, text, etc.) provided by the Service belong to the Service provider. Users may share results for personal use through the sharing features provided by the Service, but unauthorized reproduction or distribution for commercial purposes is prohibited.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">Article 7 (User Obligations)</h2>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Users must comply with relevant laws and the provisions of these Terms when using the Service.</li>
                            <li>Users must not engage in acts that interfere with the normal operation of the Service (excessive API calls, crawling, hacking attempts, etc.).</li>
                            <li>Users must not infringe on the personal information of others or defame others.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">Article 8 (Governing Law and Jurisdiction)</h2>
                        <p>The interpretation and application of these Terms shall be governed by the laws of the Republic of Korea, and conflicting disputes related to the use of the Service shall be subject to the jurisdiction of the competent court.</p>
                    </section>

                    <section>
                        <p className="mt-6 text-slate-500 text-xs">These Terms are effective from February 14, 2026.</p>
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
