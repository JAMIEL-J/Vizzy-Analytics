import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { authApi } from '../../lib/api/auth';
import ThemeToggle from '../../components/ui/ThemeToggle';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await authApi.loginUser({ email, password });
            localStorage.setItem('access_token', response.access_token);
            localStorage.setItem('refresh_token', response.refresh_token);
            navigate('/user/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen font-display overflow-x-hidden antialiased flex items-center justify-center px-4 py-12 transition-colors duration-300"
            style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}
        >
            <div className="grain-overlay"></div>

            {/* Theme toggle - top right */}
            <div className="fixed top-6 right-6 z-50">
                <ThemeToggle />
            </div>

            <div className="max-w-4xl w-full relative z-10">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase hover:text-primary transition-colors mb-8 group"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <span className="material-symbols-outlined text-[1rem] group-hover:-translate-x-1 transition-transform">arrow_left</span>
                    Return to Home
                </Link>

                <div className="auth-card p-8 md:p-12 rounded-lg relative overflow-hidden">
                    {/* Top laser accent */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

                    {/* Admin Login Link */}
                    <div className="absolute top-6 right-6">
                        <Link
                            to="/admin/login"
                            className="text-[10px] font-mono uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <span className="material-symbols-outlined text-[1rem]">admin_panel_settings</span>
                            Admin
                        </Link>
                    </div>

                    <div className="text-center mb-10">
                        <div
                            className="inline-flex items-center justify-center w-12 h-12 rounded text-primary mb-6"
                            style={{ border: '1px solid var(--border-main)', background: 'var(--bg-badge)' }}
                        >
                            <span className="material-symbols-outlined text-2xl">diamond</span>
                        </div>
                        <h2 className="text-4xl font-light tracking-tight mb-2" style={{ color: 'var(--text-main)' }}>
                            ACCESS<br />
                            <span className="italic font-serif text-3xl" style={{ color: 'var(--text-muted)' }}>THE PLATFORM</span>
                        </h2>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 border border-red-500/30 bg-red-500/10 rounded text-red-500 text-xs font-mono uppercase tracking-widest text-center">
                            {error}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                            <div>
                                <label
                                    className="block text-xs font-mono uppercase tracking-widest mb-2"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    Email Identity
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="form-input-themed w-full rounded-sm px-4 py-3 font-sans text-sm"
                                    placeholder="architect@epoch.com"
                                />
                            </div>

                            <div>
                                <label
                                    className="block text-xs font-mono uppercase tracking-widest mb-2"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    Access Key
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="form-input-themed w-full rounded-sm px-4 py-3 font-sans text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-8 pt-4">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 rounded-sm text-primary focus:ring-primary appearance-none checked:bg-primary checked:border-primary relative"
                                        style={{ border: '1px solid var(--border-main)', background: 'var(--bg-input)' }}
                                    />
                                    <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                        Persist Session
                                    </span>
                                </label>

                                <a href="#" className="text-xs font-mono uppercase tracking-widest hover:text-primary transition-colors" style={{ color: 'var(--text-muted)' }}>
                                    Lost Key?
                                </a>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full md:w-auto md:mx-auto relative group px-12 py-4 overflow-hidden rounded-sm bg-primary border border-primary hover:bg-transparent transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 w-full bg-black/10 transition-all duration-[250ms] ease-out group-hover:w-0"></div>
                                <span className="relative font-mono text-xs font-bold tracking-[0.2em] uppercase text-white group-hover:text-primary transition-colors flex items-center justify-center gap-2">
                                    {isLoading ? 'Authenticating...' : 'Initialize Session'}
                                    {!isLoading && <span className="material-symbols-outlined text-[1rem]">arrow_right_alt</span>}
                                </span>
                            </button>
                        </div>

                        <div className="pt-8 text-center mt-6" style={{ borderTop: '1px solid var(--border-main)' }}>
                            <p className="text-xs font-mono tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                                No Clearance?{' '}
                                <Link
                                    to="/register"
                                    className="hover:text-primary transition-colors ml-2 hover:underline underline-offset-4"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    Request Access
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
