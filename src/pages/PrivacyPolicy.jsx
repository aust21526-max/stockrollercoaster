import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-sans antialiased">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <Link to="/" className="text-cyan-400 text-sm hover:underline mb-8 inline-block">&larr; Back to Home</Link>
                <h1 className="text-3xl font-black text-white mb-2">Privacy Policy</h1>
                <p className="text-slate-500 text-sm mb-8">Privacy Policy · Last Updated: February 14, 2026</p>

                <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-400 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">1. Purpose of Collection and Use of Personal Information</h2>
                        <p>Stock Volatility Rollercoaster (hereinafter "the Service") may collect minimal personal information to provide and improve the service. The collected information is used only for the following purposes:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Statistical analysis of service usage and improvement of service quality</li>
                            <li>Response to and processing of user inquiries</li>
                            <li>Fulfillment of legal obligations and dispute resolution</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">2. Items of Personal Information Collected</h2>
                        <p>The Service does not require a membership registration process. The stock ticker and date information entered by the user are not stored on the server but are cached only in the browser's Local Storage. Information that may be automatically collected includes:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Server log information such as IP address, browser type, access time, etc.</li>
                            <li>User environment information via Cookies (including for advertising purposes)</li>
                            <li>Service usage pattern information via third-party analysis tools such as Google Analytics</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">3. Retention and Use Period of Personal Information</h2>
                        <p>Collected personal information is destroyed without delay after the purpose of collection is achieved. However, if retention is required by relevant laws and regulations, it will be stored for the period specified by such laws.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">4. Provision of Personal Information to Third Parties</h2>
                        <p>The Service does not provide users' personal information to third parties in principle. However, exceptions are made in the following cases:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>When the user agrees in advance</li>
                            <li>When requested by investigative agencies in accordance with procedures and methods prescribed by laws for investigation purposes</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">5. Advertising and Cookies</h2>
                        <p>The Service may display advertisements via Google AdSense, and cookies may be used in this process. For more information on Google's use of advertising cookies, please refer to the <a href="https://policies.google.com/technologies/ads" className="text-cyan-400 hover:underline" target="_blank" rel="noopener noreferrer">Google Advertising Policy</a>. Users can refuse to save cookies through browser settings, but this may limit the use of some services.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">6. Privacy Officer</h2>
                        <p>If you have any questions regarding the processing of personal information, please contact us at:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Email: aust21526@gmail.com</li>
                            <li>You can also contact us via the <Link to="/contact" className="text-cyan-400 hover:underline">Contact Page</Link>.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">7. Changes to Privacy Policy</h2>
                        <p>This Privacy Policy may be modified according to changes in relevant laws, guidelines, or services, and changes will be announced on this page. This policy is effective from February 14, 2026.</p>
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
