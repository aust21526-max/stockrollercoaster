import React from 'react';
import { Link } from 'react-router-dom';

const Contact = () => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 font-sans antialiased">
            <div className="max-w-3xl mx-auto px-6 py-16">
                <Link to="/" className="text-cyan-400 text-sm hover:underline mb-8 inline-block">&larr; Back to Home</Link>
                <h1 className="text-3xl font-black text-white mb-2">Contact Us</h1>
                <p className="text-slate-500 text-sm mb-8">Contact Us · Send us your feedback, suggestions, or inquiries.</p>

                <div className="prose prose-invert prose-sm max-w-none space-y-6 text-slate-400 leading-relaxed">
                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">📧 Email Inquiries</h2>
                        <p>For service usage, feature suggestions, bug reports, and advertising inquiries, please contact us at the email below.</p>
                        <div className="mt-3 p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl">
                            <p className="text-white font-mono font-bold text-lg">aust21526@gmail.com</p>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">We will respond within 1-3 business days.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">💡 Feedback & Suggestions</h2>
                        <p>We welcome any ideas to make Stock Volatility Rollercoaster a better service. We are looking forward to your feedback on:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>New feature ideas (e.g., new badges, analysis metrics)</li>
                            <li>UI/UX improvement suggestions</li>
                            <li>Data-related requests (new markets, indices, etc.)</li>
                            <li>General user reviews</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">🐛 Bug Reports</h2>
                        <p>If you encounter any issues while using the service, please send us an email with the following information for a faster resolution:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Browser and Operating System used</li>
                            <li>Stock ticker and date where the issue occurred</li>
                            <li>Screenshot of the error message (if available)</li>
                            <li>Steps to reproduce the issue</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">📢 Business & Advertising</h2>
                        <p>For advertising, partnerships, and collaboration inquiries, please include <strong>[Business]</strong> in the email subject line.</p>
                    </section>

                    <section>
                        <h2 className="text-lg font-bold text-white mt-8 mb-3">⚖️ Legal Inquiries</h2>
                        <p>For inquiries related to copyright, privacy, and other legal matters, please include <strong>[Legal]</strong> in the email subject line. Attaching relevant documents will help us process your request more quickly.</p>
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
