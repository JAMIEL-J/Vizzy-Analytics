import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { authApi } from '../../lib/api/auth';

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
            // Store tokens
            localStorage.setItem('access_token', response.access_token);
            localStorage.setItem('refresh_token', response.refresh_token);
            // Navigate to dashboard
            navigate('/user/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background-dark text-white font-display overflow-x-hidden antialiased flex items-center justify-center px-4 py-12">
            <div className="grain-overlay"></div>

            <div className="max-w-4xl w-full relative z-10">
                <Link to="/" className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-gray-500 hover:text-primary transition-colors mb-8 group">
                    <span className="material-symbols-outlined text-[1rem] group-hover:-translate-x-1 transition-transform">arrow_left</span>
                    Return to Void
                </Link>

                <div className="obsidian-card p-8 md:p-12 rounded-lg relative overflow-hidden">
                    {/* Top laser accent */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

                    {/* Admin Login Link */}
                    <div className="absolute top-6 right-6">
                        <Link
                            to="/admin/login"
                            className="text-[10px] font-mono uppercase tracking-widest text-gray-500 hover:text-primary transition-colors flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[1rem]">admin_panel_settings</span>
                            Admin
                        </Link>
                    </div>

                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded border border-white/10 bg-white/5 text-primary mb-6">
                            <span className="material-symbols-outlined text-2xl">diamond</span>
                        </div>
                        <h2 className="text-4xl font-light tracking-tight mb-2">ACCESS<br /><span className="text-gray-500 italic font-serif text-3xl">THE PLATFORM</span></h2>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 border border-red-500/30 bg-red-500/10 rounded text-red-400 text-xs font-mono uppercase tracking-widest text-center">
                            {error}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                            <div>
                                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">Email Identity</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-sm px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors font-sans text-sm"
                                    placeholder="architect@epoch.com"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">Access Key</label>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-sm px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors font-sans text-sm"
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
                                        className="w-4 h-4 bg-black border border-white/20 rounded-sm text-primary focus:ring-primary focus:ring-offset-background-dark appearance-none checked:bg-primary checked:border-primary relative"
                                    />
                                    <span className="text-xs font-mono uppercase tracking-widest text-gray-400">Persist Session</span>
                                </label>

                                <a href="#" className="text-xs font-mono uppercase tracking-widest text-gray-500 hover:text-primary transition-colors">
                                    Lost Key?
                                </a>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full md:w-auto md:mx-auto relative group px-12 py-4 overflow-hidden rounded-sm bg-primary border border-primary hover:bg-transparent transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 w-full bg-black/10 transition-all duration-[250ms] ease-out group-hover:w-0"></div>
                                <span className="relative font-mono text-xs font-bold tracking-[0.2em] uppercase text-black group-hover:text-primary transition-colors flex items-center justify-center gap-2">
                                    {isLoading ? 'Authenticating...' : 'Initialize Session'}
                                    {!isLoading && <span className="material-symbols-outlined text-[1rem]">arrow_right_alt</span>}
                                </span>
                            </button>
                        </div>

                        <div className="pt-8 border-t border-white/10 text-center mt-6">
                            <p className="text-xs font-mono tracking-widest text-gray-500 uppercase">
                                No Clearance? <Link to="/register" className="text-white hover:text-primary transition-colors ml-2 hover:underline underline-offset-4">Request Access</Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
