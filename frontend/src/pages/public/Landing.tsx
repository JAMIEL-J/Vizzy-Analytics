import { Link } from 'react-router-dom';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function Landing() {
    return (
        <div
            className="newsreader-page font-display overflow-x-hidden antialiased selection:bg-primary selection:text-black"
            style={{ background: 'var(--landing-bg)', color: 'var(--text-main)' }}
        >
            <div className="grain-overlay"></div>

            {/* Navigation: Floating Monolith */}
            <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-5xl px-4">
                <div className="glass-panel rounded-full px-8 py-4 flex items-center justify-between mx-auto max-w-3xl relative overflow-hidden">
                    {/* Top laser accent */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                    <Link className="flex items-center gap-3 group" to="/">
                        <span className="material-symbols-outlined text-primary group-hover:rotate-45 transition-transform duration-500">diamond</span>
                        <span className="font-bold tracking-widest text-lg" style={{ color: 'var(--text-main)' }}>VIZZY</span>
                    </Link>
                    <div className="hidden md:flex items-center gap-8 font-mono text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                        <a className="hover:text-primary transition-colors" href="#features">Capabilities</a>
                        <a className="hover:text-primary transition-colors" href="#how-it-works">Process</a>
                        <a className="hover:text-primary transition-colors" href="#">Pricing</a>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle size="sm" />
                        <Link to="/login" className="bg-primary text-white px-5 py-2 rounded-full text-xs font-bold tracking-widest hover:bg-white hover:text-black transition-all duration-300 font-mono uppercase">
                            Access
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section: The Prism */}
            <section className="relative min-h-screen flex flex-col items-center justify-center pt-24 overflow-hidden" style={{ background: 'var(--landing-bg)' }}>
                {/* Abstract Background Elements */}
                <div className="absolute inset-0 z-0">
                    {/* Vertical laser line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-primary/20 to-transparent"></div>
                    {/* Horizontal floor line */}
                    <div className="absolute bottom-[15%] left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(128,128,128,0.12), transparent)' }}></div>
                    {/* Prism Effect */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-primary/5 via-purple-900/10 to-blue-900/5 blur-[100px] opacity-40"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-6xl w-full">
                    {/* Main Typography */}
                    <div className="relative mb-8">
                        <h1 className="text-[14vw] leading-[0.8] font-thin tracking-tighter mix-blend-screen opacity-90 select-none">
                            <span className="block translate-y-4">DATA</span>
                            <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-600 italic font-light">IN FOCUS</span>
                        </h1>
                        {/* Decorative geometric element overlaying text */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[1px] bg-primary/30 rotate-12 blur-[1px]"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[2px] bg-primary mix-blend-overlay rotate-12"></div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12 mt-12">
                        <p className="font-mono text-xs md:text-sm max-w-xs text-center md:text-right uppercase tracking-widest leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            The AI-native analytics platform <br /> powered by natural language.
                        </p>
                        <div className="h-12 w-[1px] hidden md:block" style={{ background: 'var(--border-main)' }}></div>
                        <Link to="/register" className="group relative px-8 py-3 overflow-hidden rounded-sm bg-transparent border hover:border-primary/50 transition-colors duration-300" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="absolute inset-0 w-0 bg-primary/10 transition-all duration-[250ms] ease-out group-hover:w-full"></div>
                            <span className="relative font-mono text-xs font-bold tracking-[0.2em] uppercase group-hover:text-primary transition-colors" style={{ color: 'var(--text-main)' }}>Start Analyzing</span>
                        </Link>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-50">
                    <div className="w-[1px] h-16" style={{ background: 'linear-gradient(to bottom, transparent, var(--text-muted), transparent)' }}></div>
                    <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>Scroll</span>
                </div>
            </section>

            {/* Stats Section: System Capabilities */}
            <section className="relative py-24 px-6" style={{ background: 'var(--landing-card-bg)', borderTop: '1px solid var(--border-subtle)' }}>
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-4">
                        {/* Stat 1 */}
                        <div className="obsidian-card p-8 md:p-12 rounded-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity duration-500">
                                <span className="material-symbols-outlined text-primary">bolt</span>
                            </div>
                            <p className="font-mono text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Inference Engine</p>
                            <h3 className="text-4xl md:text-5xl font-light tracking-tight" style={{ color: 'var(--text-main)' }}>GROQ API<span className="text-primary text-2xl align-top">•</span></h3>
                            <p className="mt-4 text-sm font-light font-display italic" style={{ color: 'var(--text-muted)' }}>Lightning fast SQL generation.</p>
                            <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary group-hover:w-full transition-all duration-700 ease-out"></div>
                        </div>

                        {/* Stat 2 */}
                        <div className="obsidian-card p-8 md:p-12 rounded-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity duration-500">
                                <span className="material-symbols-outlined text-primary">analytics</span>
                            </div>
                            <p className="font-mono text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Architecture</p>
                            <h3 className="text-4xl md:text-5xl font-light tracking-tight" style={{ color: 'var(--text-main)' }}>Llama 3.1</h3>
                            <p className="mt-4 text-sm font-light font-display italic" style={{ color: 'var(--text-muted)' }}>Highly precise analytical models.</p>
                            <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary group-hover:w-full transition-all duration-700 ease-out delay-100"></div>
                        </div>

                        {/* Stat 3 */}
                        <div className="obsidian-card p-8 md:p-12 rounded-lg relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity duration-500">
                                <span className="material-symbols-outlined text-primary">speed</span>
                            </div>
                            <p className="font-mono text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-muted)' }}>Friction</p>
                            <h3 className="text-5xl md:text-6xl font-light tracking-tight" style={{ color: 'var(--text-main)' }}>ZERO</h3>
                            <p className="mt-4 text-sm font-light font-display italic" style={{ color: 'var(--text-muted)' }}>Setup to insights in seconds.</p>
                            <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary group-hover:w-full transition-all duration-700 ease-out delay-200"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature Monoliths */}
            <section id="features" className="py-32 px-4 relative overflow-hidden" style={{ background: 'var(--landing-bg)' }}>
                {/* Background texture */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 z-0" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/dark-matter.png')" }}></div>

                <div className="max-w-6xl mx-auto relative z-10 flex flex-col gap-32">
                    {/* Section Header */}
                    <div className="flex flex-col gap-6 items-start">
                        <span className="font-mono text-primary text-xs uppercase tracking-[0.3em] pl-1 border-l border-primary">Core Protocol</span>
                        <h2 className="text-5xl md:text-7xl font-light tracking-tighter max-w-2xl" style={{ color: 'var(--text-main)' }}>
                            Intelligent analytics <br /> <span className="italic font-serif" style={{ color: 'var(--text-muted)' }}>driven by language.</span>
                        </h2>
                    </div>

                    {/* Feature 1: Ingest */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center group">
                        <div className="order-2 md:order-1 flex flex-col gap-6">
                            <div className="w-12 h-12 rounded flex items-center justify-center text-primary mb-4" style={{ border: '1px solid var(--border-main)', background: 'var(--bg-badge)' }}>
                                <span className="material-symbols-outlined text-3xl">database</span>
                            </div>
                            <h3 className="text-4xl font-light tracking-tight" style={{ color: 'var(--text-main)' }}>CONNECT & MAP</h3>
                            <p className="text-lg font-light font-serif leading-relaxed max-w-md" style={{ color: 'var(--text-muted)' }}>
                                Upload CSVs or connect directly to your data warehouse. Vizzy's inference engine automatically maps your schema, identifies data types, and prepares your geometry for instant querying.
                            </p>
                            <ul className="flex flex-col gap-3 mt-4 font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                <li className="flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Auto-Schema Detection
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full group-hover:bg-primary transition-colors" style={{ background: 'var(--border-main)' }}></span> CSV & Database Support
                                </li>
                            </ul>
                        </div>
                        {/* Image/Visual */}
                        <div className="order-1 md:order-2 relative aspect-[4/3] rounded-sm overflow-hidden" style={{ border: '1px solid var(--border-subtle)', background: 'var(--landing-feature-img)' }}>
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent mix-blend-overlay z-10"></div>
                            <div className="w-full h-full bg-cover bg-center opacity-60 grayscale group-hover:grayscale-0 transition-all duration-1000 transform group-hover:scale-105" data-alt="Abstract data ingestion" style={{ backgroundImage: "url('/feature_1.png')" }}>
                            </div>
                        </div>
                    </div>

                    {/* Feature 2: Natural Querying */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center group">
                        <div className="order-1 relative aspect-[4/3] rounded-sm overflow-hidden" style={{ border: '1px solid var(--border-subtle)', background: 'var(--landing-feature-img)' }}>
                            <div className="absolute inset-0 bg-gradient-to-bl from-primary/10 to-transparent mix-blend-overlay z-10"></div>
                            <div className="w-full h-full bg-cover bg-center opacity-60 grayscale group-hover:grayscale-0 transition-all duration-1000 transform group-hover:scale-105" data-alt="Text to SQL execution visualization" style={{ backgroundImage: "url('/feature_2.png')" }}>
                            </div>
                        </div>
                        <div className="order-2 flex flex-col gap-6 md:pl-10">
                            <div className="w-12 h-12 rounded flex items-center justify-center text-primary mb-4" style={{ border: '1px solid var(--border-main)', background: 'var(--bg-badge)' }}>
                                <span className="material-symbols-outlined text-3xl">query_stats</span>
                            </div>
                            <h3 className="text-4xl font-light tracking-tight" style={{ color: 'var(--text-main)' }}>NATURAL QUERYING</h3>
                            <p className="text-lg font-light font-serif leading-relaxed max-w-md" style={{ color: 'var(--text-muted)' }}>
                                Stop writing complex SQL. Ask questions in natural language, and our Groq-accelerated AI instantly translates them into highly exact optimized queries and selects the perfect chart layout.
                            </p>
                            <ul className="flex flex-col gap-3 mt-4 font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                <li className="flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Text-to-SQL Pipeline
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full group-hover:bg-primary transition-colors" style={{ background: 'var(--border-main)' }}></span> Smart Chart Suggestions
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Feature 3: Insights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center group">
                        <div className="order-2 md:order-1 flex flex-col gap-6">
                            <div className="w-12 h-12 rounded flex items-center justify-center text-primary mb-4" style={{ border: '1px solid var(--border-main)', background: 'var(--bg-badge)' }}>
                                <span className="material-symbols-outlined text-3xl">insights</span>
                            </div>
                            <h3 className="text-4xl font-light tracking-tight" style={{ color: 'var(--text-main)' }}>INSIGHTS & KPIs</h3>
                            <p className="text-lg font-light font-serif leading-relaxed max-w-md" style={{ color: 'var(--text-muted)' }}>
                                Go beyond simple charts. Vizzy automatically calculates key performance indicators, extracts dataset trends, and generates cohesive dashboards to uncover hidden patterns immediately.
                            </p>
                            <ul className="flex flex-col gap-3 mt-4 font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                <li className="flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Auto-Generated KPIs
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="w-1.5 h-1.5 rounded-full group-hover:bg-primary transition-colors" style={{ background: 'var(--border-main)' }}></span> Trend Extraction
                                </li>
                            </ul>
                        </div>
                        <div className="order-1 md:order-2 relative aspect-[4/3] rounded-sm overflow-hidden" style={{ border: '1px solid var(--border-subtle)', background: 'var(--landing-feature-img)' }}>
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent mix-blend-overlay z-10"></div>
                            <div className="w-full h-full bg-cover bg-center opacity-60 grayscale group-hover:grayscale-0 transition-all duration-1000 transform group-hover:scale-105" data-alt="KPI metrics and chart insights" style={{ backgroundImage: "url('/feature_3.png')" }}>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Visual Grid: Process Flow */}
            <section id="how-it-works" className="py-20 px-4" style={{ background: 'var(--landing-how-bg)' }}>
                <div className="max-w-7xl mx-auto flex flex-col gap-12">
                    <div className="flex flex-col gap-4 items-center text-center">
                        <span className="font-mono text-primary text-xs uppercase tracking-[0.3em]">Workflow Process</span>
                        <h2 className="text-3xl font-light tracking-tighter" style={{ color: 'var(--text-main)' }}>
                            How it <span className="italic font-serif" style={{ color: 'var(--text-muted)' }}>works</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Card 1 */}
                        <div className="group relative aspect-[3/4] overflow-hidden rounded-lg cursor-pointer">
                            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-70" data-alt="Abstract data origin" style={{ backgroundImage: "url('/workflow_1.png')" }}>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90"></div>
                            <div className="absolute bottom-0 left-0 p-8 flex flex-col gap-2">
                                <span className="font-mono text-[10px] text-primary uppercase tracking-widest">01</span>
                                <h4 className="text-xl font-light text-white uppercase mt-1">Upload Data</h4>
                                <p className="font-mono text-xs text-gray-400">Connect to your dataset</p>
                                <div className="h-[1px] w-0 bg-primary mt-2 group-hover:w-full transition-all duration-500"></div>
                            </div>
                        </div>

                        {/* Card 2 */}
                        <div className="group relative aspect-[3/4] overflow-hidden rounded-lg cursor-pointer mt-0 md:-mt-12">
                            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-70" data-alt="Abstract data processing" style={{ backgroundImage: "url('/workflow_2.png')" }}>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90"></div>
                            <div className="absolute bottom-0 left-0 p-8 flex flex-col gap-2">
                                <span className="font-mono text-[10px] text-primary uppercase tracking-widest">02</span>
                                <h4 className="text-xl font-light text-white uppercase mt-1">Ask Questions</h4>
                                <p className="font-mono text-xs text-gray-400">Query using plain english</p>
                                <div className="h-[1px] w-0 bg-primary mt-2 group-hover:w-full transition-all duration-500"></div>
                            </div>
                        </div>

                        {/* Card 3 */}
                        <div className="group relative aspect-[3/4] overflow-hidden rounded-lg cursor-pointer">
                            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-70" data-alt="Abstract data output" style={{ backgroundImage: "url('/workflow_3.png')" }}>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90"></div>
                            <div className="absolute bottom-0 left-0 p-8 flex flex-col gap-2">
                                <span className="font-mono text-[10px] text-primary uppercase tracking-widest">03</span>
                                <h4 className="text-xl font-light text-white uppercase mt-1">Visualize</h4>
                                <p className="font-mono text-xs text-gray-400">Save and share dashboards</p>
                                <div className="h-[1px] w-0 bg-primary mt-2 group-hover:w-full transition-all duration-500"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative py-32 px-4 flex flex-col items-center justify-center" style={{ background: 'var(--landing-cta-bg)', borderTop: '1px solid var(--border-subtle)' }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-20 bg-gradient-to-b from-primary to-transparent"></div>
                <div className="text-center space-y-8 max-w-2xl relative z-10">
                    <h2 className="text-5xl md:text-8xl font-light tracking-tighter" style={{ color: 'var(--text-main)' }}>
                        ENTER THE <br /> <span className="italic font-serif" style={{ color: 'var(--text-muted)' }}>NEW EPOCH</span>
                    </h2>
                    <p className="font-mono text-sm tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Join the architects of analytical insight.
                    </p>
                    <Link to="/register" className="inline-block mt-8 px-12 py-4 bg-primary text-white font-bold text-sm tracking-widest uppercase hover:bg-white hover:text-black transition-colors duration-300 rounded-sm">
                        Get Access
                    </Link>
                </div>
            </section>

            {/* Professional Footer */}
            <footer className="pt-20 pb-10 px-8 relative overflow-hidden" style={{ background: 'var(--landing-footer-bg)', borderTop: '1px solid var(--border-subtle)' }}>
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16 relative z-10">
                        <div className="lg:col-span-2">
                            <Link className="flex items-center gap-3 mb-6" to="/">
                                <span className="material-symbols-outlined text-primary">diamond</span>
                                <span className="font-bold tracking-widest text-xl text-white">VIZZY</span>
                            </Link>
                            <p className="font-mono text-xs leading-relaxed max-w-xs mb-8" style={{ color: 'var(--landing-footer-text)' }}>
                                AI-native business intelligence platform relying on pure inference to connect data and visualizations bridging the void.
                            </p>
                        </div>

                        <div className="flex flex-col gap-4">
                            <h4 className="font-mono text-xs text-white uppercase tracking-widest mb-2 border-l border-primary pl-2">Platform</h4>
                            <a href="#" className="font-mono text-xs hover:text-primary transition-colors" style={{ color: 'var(--landing-footer-text)' }}>Data Connections</a>
                            <a href="#" className="font-mono text-xs hover:text-primary transition-colors" style={{ color: 'var(--landing-footer-text)' }}>Natural Language SQL</a>
                            <a href="#" className="font-mono text-xs hover:text-primary transition-colors" style={{ color: 'var(--landing-footer-text)' }}>Automated KPI Boards</a>
                            <a href="#" className="font-mono text-xs hover:text-primary transition-colors" style={{ color: 'var(--landing-footer-text)' }}>Enterprise Security</a>
                        </div>

                        <div className="flex flex-col gap-4">
                            <h4 className="font-mono text-xs text-white uppercase tracking-widest mb-2 border-l border-primary pl-2">Resources</h4>
                            <a href="#" className="font-mono text-xs hover:text-primary transition-colors" style={{ color: 'var(--landing-footer-text)' }}>Documentation</a>
                            <a href="#" className="font-mono text-xs hover:text-primary transition-colors" style={{ color: 'var(--landing-footer-text)' }}>API Reference</a>
                            <a href="#" className="font-mono text-xs hover:text-primary transition-colors" style={{ color: 'var(--landing-footer-text)' }}>Tutorials</a>
                            <a href="#" className="font-mono text-xs hover:text-primary transition-colors" style={{ color: 'var(--landing-footer-text)' }}>System Status</a>
                        </div>

                        <div className="flex flex-col gap-4">
                            <h4 className="font-mono text-xs text-white uppercase tracking-widest mb-2 border-l border-primary pl-2">Company</h4>
                            <a href="#" className="font-mono text-xs hover:text-primary transition-colors" style={{ color: 'var(--landing-footer-text)' }}>About Us</a>
                            <a href="#" className="font-mono text-xs hover:text-primary transition-colors" style={{ color: 'var(--landing-footer-text)' }}>Careers</a>
                            <a href="#" className="font-mono text-xs hover:text-primary transition-colors" style={{ color: 'var(--landing-footer-text)' }}>Contact Support</a>
                            <div className="flex items-center gap-4 mt-2">
                                <a href="#" className="hover:text-primary transition-colors" style={{ color: 'var(--landing-footer-text)' }}>
                                    <span className="material-symbols-outlined text-[1.2rem]">share</span>
                                </a>
                                <a href="#" className="hover:text-primary transition-colors" style={{ color: 'var(--landing-footer-text)' }}>
                                    <span className="material-symbols-outlined text-[1.2rem]">mail</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-mono uppercase tracking-widest relative z-10" style={{ borderTop: '1px solid rgba(128,128,128,0.2)', color: 'var(--landing-footer-text)' }}>
                        <div className="flex gap-6">
                            <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
                            <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
                            <a className="hover:text-primary transition-colors" href="#">Security Parameters</a>
                        </div>
                        <div>
                            © 2026 VIZZY ANALYTICS PLATFORM
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
