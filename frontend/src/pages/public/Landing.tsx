
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Grainient from '@/components/ui/backgrounds/Grainient';


export default function Landing() {
    const [mobileOpen, setMobileOpen] = useState(false);
    return (
        <div className="min-h-screen relative font-sans text-navy dark:text-gray-100 transition-colors duration-500 overflow-x-hidden">
            {/* Global Dynamic Background */}
            <div className="fixed inset-0 z-0 opacity-100 pointer-events-none">
                <Grainient
                    color1="#5fcbec"
                    color2="#22ecde"
                    color3="#1b54c5"
                    timeSpeed={0.25}
                    colorBalance={0}
                    warpStrength={1}
                    warpFrequency={5}
                    warpSpeed={2}
                    warpAmplitude={50}
                    blendAngle={0}
                    blendSoftness={0.05}
                    rotationAmount={500}
                    noiseScale={0}
                    grainAmount={0}
                    grainScale={2}
                    grainAnimated={false}
                    contrast={1}
                    gamma={0.45}
                    saturation={1}
                    centerX={0.03}
                    centerY={0.65}
                    zoom={0.9}
                />
            </div>

            {/* Navigation */}
            <nav className="fixed w-full z-50 bg-black/20 backdrop-blur-xl border-b border-white/15">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-navy to-primary-blue flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                </svg>
                            </div>
                            <span className="text-2xl font-bold text-white drop-shadow">Vizzy</span>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Desktop nav */}
                            <div className="hidden md:flex items-center gap-4">
                                <a href="#features" className="text-white/90 font-medium hover:text-white transition">Features</a>
                                <a href="#how-it-works" className="text-white/90 font-medium hover:text-white transition">How It Works</a>
                                <Link to="/login" className="px-5 py-2 text-white/90 font-medium rounded-lg border border-white/30 hover:bg-white/10 hover:text-white transition-all duration-200">Sign In</Link>
                                <Link
                                    to="/register"
                                    className="px-5 py-2 bg-white text-primary-blue font-semibold rounded-lg hover:bg-gray-100 transition-all duration-200 shadow-md"
                                >
                                    Get Started
                                </Link>
                            </div>
                            {/* Mobile hamburger */}
                            <button
                                className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 border border-white/20 cursor-pointer"
                                onClick={() => setMobileOpen(o => !o)}
                                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                                aria-expanded={mobileOpen}
                            >
                                {mobileOpen ? (
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
                {/* Mobile drawer */}
                {mobileOpen && (
                    <div className="md:hidden bg-black/60 backdrop-blur-xl border-t border-white/10 px-4 pt-4 pb-6 flex flex-col gap-4">
                        <a href="#features" onClick={() => setMobileOpen(false)} className="text-white/90 font-medium hover:text-white transition py-2 border-b border-white/10">Features</a>
                        <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="text-white/90 font-medium hover:text-white transition py-2 border-b border-white/10">How It Works</a>
                        <div className="flex flex-col gap-3 pt-2">
                            <Link to="/login" onClick={() => setMobileOpen(false)} className="w-full text-center px-5 py-3 text-white/90 font-medium rounded-lg border border-white/30 hover:bg-white/10 transition-all duration-200">Sign In</Link>
                            <Link to="/register" onClick={() => setMobileOpen(false)} className="w-full text-center px-5 py-3 bg-white text-primary-blue font-semibold rounded-lg hover:bg-gray-100 transition-all duration-200 shadow-md">Get Started</Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="pt-40 pb-20 relative overflow-hidden transition-colors duration-500 min-h-screen flex items-center bg-transparent">
                {/* Left-side scrim so hero text stays legible over any gradient colour */}
                <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
                    <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-black/5 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/5"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="text-white animate-slide-up">
                            <div className="rounded-3xl border border-white/20 bg-white/5 backdrop-blur-sm p-8 shadow-[0_0_40px_0_rgba(0,0,0,0.25)]">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/40 rounded-full text-sm mb-6 backdrop-blur-sm border border-white/20 text-white animate-badge-glow">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                    </svg>
                                    AI-Powered Analytics Platform
                                </div>
                                <h1 className="text-5xl md:text-7xl font-bold mb-5 leading-tight text-white">
                                    Turn Data into
                                    <span className="block gradient-text">
                                        Decisions
                                    </span>
                                </h1>
                                <p className="text-xl text-white/90 mb-8 leading-relaxed">
                                    Chat with your data in plain English — no SQL, no code, just answers.
                                </p>
                                <div className="flex flex-wrap gap-4">
                                    <Link
                                        to="/register"
                                        className="px-8 py-4 bg-white text-primary-blue font-semibold rounded-lg hover:bg-gray-100 transition-all duration-200 shadow-xl"
                                    >
                                        Start Analyzing Free
                                    </Link>
                                    <button
                                        className="flex items-center gap-2 px-8 py-4 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 hover:shadow-lg hover:shadow-cyan/10 transition-all duration-300 backdrop-blur-sm border border-white/30 cursor-pointer group"
                                        title="Video demo coming soon"
                                        aria-label="Watch product demo — coming soon"
                                    >
                                        <svg className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                        Watch Demo
                                    </button>
                                </div>

                                <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-white/80">
                                    <div className="flex items-center gap-1.5">
                                        <svg className="w-5 h-5 text-[#00e5ff] shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                                        </svg>
                                        No SQL Required
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <svg className="w-5 h-5 text-[#00e5ff] shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                                        </svg>
                                        Instant Insights
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <svg className="w-5 h-5 text-[#00e5ff] shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                                        </svg>
                                        No Credit Card Required
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hero Image / Glass Card */}
                        <div className="relative animate-slide-up mt-12 lg:mt-0" style={{ animationDelay: '0.2s' }}>
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 sm:p-8 rounded-2xl shadow-2xl">
                                <div className="bg-white rounded-xl p-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-blue to-accent-cyan flex items-center justify-center text-white font-bold shrink-0">
                                                U
                                            </div>
                                            <div className="flex-1 bg-gray-100 rounded-2xl p-4 rounded-tl-none">
                                                <p className="text-gray-700">What's the total sales by region?</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 justify-end">
                                            <div className="flex-1 bg-primary-blue/5 rounded-2xl p-4 rounded-tr-none">
                                                <p className="text-gray-700 mb-3">Here's the sales breakdown by region:</p>
                                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                                    <div className="flex items-end justify-around h-32 mb-3">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="w-10 bg-primary-blue rounded-t-md h-20"></div>
                                                            <span className="text-xs text-gray-600">East</span>
                                                            <span className="text-xs font-semibold">$45K</span>
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="w-10 bg-accent-cyan rounded-t-md h-24"></div>
                                                            <span className="text-xs text-gray-600">West</span>
                                                            <span className="text-xs font-semibold">$52K</span>
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="w-10 bg-accent-orange rounded-t-md h-16"></div>
                                                            <span className="text-xs text-gray-600">South</span>
                                                            <span className="text-xs font-semibold">$38K</span>
                                                        </div>
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="w-10 bg-green-500 rounded-t-md h-[88px]"></div>
                                                            <span className="text-xs text-gray-600">North</span>
                                                            <span className="text-xs font-semibold">$48K</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-3 bg-gradient-to-r from-primary-blue/10 to-accent-cyan/10 rounded-lg p-3 border-l-4 border-accent-cyan">
                                                    <p className="text-sm text-gray-700 flex items-center gap-1.5">
                                                        <svg className="w-4 h-4 text-primary-blue shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                        </svg>
                                                        <span className="font-semibold text-navy">Insight:</span> West region leads with $52K in sales, 15% higher than average.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy to-primary-blue flex items-center justify-center shrink-0">
                                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-transparent px-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
                    </span>
                </div>
            </div>

            {/* Features Section */}
            <section id="features" className="py-28 bg-transparent transition-colors duration-500">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg mb-4">Powerful Features</h2>
                        <p className="text-lg text-white/75 max-w-2xl mx-auto">Everything you need to turn data into actionable insights</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-black/35 backdrop-blur-xl p-8 rounded-2xl hover:bg-black/45 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border border-white/15">
                            <div className="w-14 h-14 bg-primary-blue rounded-xl flex items-center justify-center mb-6">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">Chat Analytics (NL Querying)</h3>
                            <p className="text-white/90 leading-relaxed">
                                Ask questions in plain English, Vizzy understands context and get instant answers with charts. No SQL or coding required.
                            </p>
                            <ul className="mt-4 space-y-2.5 text-sm text-white/80">
                                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-[#00e5ff] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> Smart intent classification</li>
                                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-[#00e5ff] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> Auto chart explanation</li>
                                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-[#00e5ff] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> Session memory for context</li>
                            </ul>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-black/35 backdrop-blur-xl p-8 rounded-2xl hover:bg-black/45 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border border-white/15">
                            <div className="w-14 h-14 bg-accent-orange rounded-xl flex items-center justify-center mb-6">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">Data Cleaning Studio</h3>
                            <p className="text-white/90 leading-relaxed">
                                Auto health checks with smart cleaning recommendations. Approve before applying.
                            </p>
                            <ul className="mt-4 space-y-2.5 text-sm text-white/80">
                                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-[#00e5ff] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> Health score &amp; data profiling</li>
                                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-[#00e5ff] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> Duplicate &amp; anomaly detection</li>
                                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-[#00e5ff] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> Approval-based cleaning</li>
                            </ul>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-black/35 backdrop-blur-xl p-8 rounded-2xl hover:bg-black/45 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border border-white/15">
                            <div className="w-14 h-14 bg-accent-cyan rounded-xl flex items-center justify-center mb-6">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">Auto Dashboards</h3>
                            <p className="text-white/90 leading-relaxed">
                                Beautiful, interactive dashboards generated automatically from your data.
                            </p>
                            <ul className="mt-4 space-y-2.5 text-sm text-white/80">
                                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-[#00e5ff] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> KPI cards &amp; metrics</li>
                                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-[#00e5ff] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> Bar, line &amp; trend charts</li>
                                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-[#00e5ff] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> Widget builder &amp; filters</li>
                            </ul>
                        </div>

                        {/* Feature 4 */}
                        <div className="bg-black/35 backdrop-blur-xl p-8 rounded-2xl hover:bg-black/45 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 group border border-white/15">
                            <div className="w-14 h-14 bg-gradient-to-br from-primary-blue to-navy rounded-xl flex items-center justify-center mb-6">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">Connect any Data</h3>
                            <p className="text-white/90 leading-relaxed">
                                Connect to your existing databases, CSV, Excel or Google Sheets.
                            </p>
                            <ul className="mt-4 space-y-2.5 text-sm text-white/80">
                                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-[#00e5ff] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> PostgreSQL, MySQL, SQL Server</li>
                                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-[#00e5ff] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> Test connections &amp; list tables</li>
                                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-[#00e5ff] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> Ingest via SELECT queries</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-transparent px-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
                    </span>
                </div>
            </div>

            {/* How It Works */}
            <section id="how-it-works" className="py-24 bg-transparent transition-colors duration-500">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg mb-4">How It Works</h2>
                        <p className="text-lg text-white/75 max-w-2xl mx-auto">From data upload to insights in 3 simple steps</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-black/35 backdrop-blur-xl p-8 rounded-2xl shadow-lg hover:bg-black/45 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-white/15">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary-blue to-accent-cyan rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                                1
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 text-center">Upload Your Data</h3>
                            <p className="text-white/85 text-center">Drag and drop your CSV, Excel, JSON file or connect to your existing databases.</p>
                        </div>

                        <div className="bg-black/35 backdrop-blur-xl p-8 rounded-2xl shadow-lg hover:bg-black/45 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-white/15">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary-blue to-accent-cyan rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                                2
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 text-center">Ask Questions</h3>
                            <p className="text-white/85 text-center">Type Naturally. "Show me the Sales Trend" or "What is the average salary of employees?"</p>
                        </div>

                        <div className="bg-black/35 backdrop-blur-xl p-8 rounded-2xl shadow-lg hover:bg-black/45 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-white/15">
                            <div className="w-16 h-16 bg-gradient-to-br from-primary-blue to-accent-cyan rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white shadow-lg">
                                3
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3 text-center">Get Insights</h3>
                            <p className="text-white/85 text-center">Receive instant answers with beautiful charts. All results are auditable and traceable.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-transparent px-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/30"></div>
                    </span>
                </div>
            </div>

            {/* CTA Section */}
            <section className="py-28 bg-transparent relative overflow-hidden transition-colors duration-500">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-accent-cyan rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-orange rounded-full blur-3xl"></div>
                </div>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">Ready to Transform Your Data?</h2>
                    <p className="text-xl text-white/90 mb-10 leading-relaxed">Join thousands of users making data-driven decisions with Vizzy. Stop guessing, start knowing.</p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link
                            to="/register"
                            className="px-8 py-4 bg-white text-primary-blue font-semibold rounded-lg hover:bg-gray-100 hover:shadow-2xl transition-all duration-300 shadow-xl"
                        >
                            Start Free Trial
                        </Link>
                        <Link
                            to="/login"
                            className="px-8 py-4 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 hover:shadow-lg transition-all duration-300 backdrop-blur-sm border border-white/30"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-black/50 backdrop-blur-xl text-white py-12 border-t border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-12 lg:gap-8">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-navy to-primary-blue flex items-center justify-center border border-white/10 shadow-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                    </svg>
                                </div>
                                <span className="text-2xl font-bold tracking-tight text-white">Vizzy</span>
                            </div>
                            <p className="text-white/60 text-sm leading-relaxed max-w-xs">AI-powered analytics that speaks your language. Turn complex data into clear answers instantly.</p>
                            <div className="flex items-center gap-4 mt-2">
                                <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10 group" aria-label="Twitter">
                                    <svg className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
                                </a>
                                <a href="#" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10 group" aria-label="LinkedIn">
                                    <svg className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                                </a>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Product</h4>
                            <ul className="space-y-4 text-sm text-white/50">
                                <li><a href="#features" className="hover:text-white transition-all cursor-pointer">Features</a></li>
                                <li className="flex items-center gap-2">
                                    <a href="#" className="hover:text-white transition-all cursor-pointer opacity-50 cursor-not-allowed">Pricing</a>
                                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/40 font-bold uppercase tracking-tighter">Soon</span>
                                </li>
                                <li><a href="#" className="hover:text-white transition-all cursor-pointer">Documentation</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Company</h4>
                            <ul className="space-y-4 text-sm text-white/50">
                                <li><a href="#" className="hover:text-white transition-all cursor-pointer">About</a></li>
                                <li className="flex items-center gap-2">
                                    <a href="#" className="hover:text-white transition-all cursor-pointer opacity-50 cursor-not-allowed">Blog</a>
                                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/40 font-bold uppercase tracking-tighter">Soon</span>
                                </li>
                                <li><a href="#" className="hover:text-white transition-all cursor-pointer">Careers</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Legal</h4>
                            <ul className="space-y-4 text-sm text-white/50">
                                <li><a href="#" className="hover:text-white transition-all cursor-pointer">Privacy</a></li>
                                <li><a href="#" className="hover:text-white transition-all cursor-pointer">Terms</a></li>
                                <li><a href="#" className="hover:text-white transition-all cursor-pointer">Security</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/30 font-medium">
                        <p>© 2024 Vizzy AI. All rights reserved.</p>
                        <div className="flex items-center gap-6">
                            <span>Built with ❤️ for data people.</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
