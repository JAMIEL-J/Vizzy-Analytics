import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { authApi } from '../../lib/api/auth';
import ThemeToggle from '../../components/ui/ThemeToggle';
import { Button } from '@/components/ui/button';

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        agreeToTerms: false
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!passwordsMatch) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            await authApi.register({
                name: formData.name.trim(),
                email: formData.email,
                password: formData.password,
            });
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const passwordsMatch = formData.password === formData.confirmPassword;
    const passwordStrength = formData.password.length >= 8 ? 'strong' : formData.password.length >= 6 ? 'medium' : 'weak';

    return (
        <div
            className="newsreader-page min-h-screen font-display overflow-x-hidden antialiased flex items-center justify-center px-4 py-12 transition-colors duration-300"
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
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

                    <div className="text-center mb-10">
                        <div
                            className="inline-flex items-center justify-center w-12 h-12 rounded text-primary mb-6"
                            style={{ border: '1px solid var(--border-main)', background: 'var(--bg-badge)' }}
                        >
                            <span className="material-symbols-outlined text-2xl">person_add</span>
                        </div>
                        <h2 className="text-3xl font-light tracking-tight mb-2" style={{ color: 'var(--text-main)' }}>
                            REQUEST<br />
                            <span className="italic font-serif text-2xl" style={{ color: 'var(--text-muted)' }}>CLEARANCE</span>
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
                                    Designation (Name)
                                </label>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="form-input-themed w-full rounded-sm px-4 py-3 font-sans text-sm"
                                    placeholder="Architect One"
                                />
                            </div>

                            <div>
                                <label
                                    className="block text-xs font-mono uppercase tracking-widest mb-2"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    Communication Link (Email)
                                </label>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="form-input-themed w-full rounded-sm px-4 py-3 font-sans text-sm"
                                    placeholder="architect@epoch.com"
                                />
                            </div>

                            <div>
                                <label
                                    className="block text-xs font-mono uppercase tracking-widest mb-2"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    Access Key (Password)
                                </label>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="form-input-themed w-full rounded-sm px-4 py-3 font-sans text-sm"
                                    placeholder="Create Key"
                                />
                                {formData.password && (
                                    <div className="mt-3">
                                        <div className="flex gap-1">
                                            <div className={`h-[2px] flex-1 ${passwordStrength === 'weak' ? 'bg-red-500' : passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                            <div className={`h-[2px] flex-1 ${passwordStrength === 'medium' || passwordStrength === 'strong' ? passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500' : 'bg-gray-300'}`} style={passwordStrength === 'weak' ? { background: 'var(--border-main)' } : {}}></div>
                                            <div className={`h-[2px] flex-1 ${passwordStrength === 'strong' ? 'bg-green-500' : ''}`} style={passwordStrength !== 'strong' ? { background: 'var(--border-main)' } : {}}></div>
                                        </div>
                                        <p className={`text-[10px] font-mono tracking-widest uppercase mt-2 ${passwordStrength === 'weak' ? 'text-red-500' : passwordStrength === 'medium' ? 'text-yellow-500' : 'text-green-500'}`}>
                                            Security Level: {passwordStrength}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label
                                    className="block text-xs font-mono uppercase tracking-widest mb-2"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    Verify Access Key
                                </label>
                                <input
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className={`form-input-themed w-full rounded-sm px-4 py-3 font-sans text-sm ${formData.confirmPassword && !passwordsMatch ? '!border-red-500' : ''}`}
                                    placeholder="Verify Key"
                                />
                                {formData.confirmPassword && !passwordsMatch && (
                                    <p className="text-[10px] text-red-500 font-mono tracking-widest uppercase mt-2">Keys do not match</p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-8 pt-4">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    name="agreeToTerms"
                                    type="checkbox"
                                    required
                                    checked={formData.agreeToTerms}
                                    onChange={handleChange}
                                    className="w-4 h-4 mt-0.5 rounded-sm text-primary focus:ring-primary appearance-none checked:bg-primary checked:border-primary relative"
                                    style={{ border: '1px solid var(--border-main)', background: 'var(--bg-input)' }}
                                />
                                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                    I accept the{' '}
                                    <a href="#" className="hover:text-primary transition-colors" style={{ color: 'var(--text-main)' }}>Directives</a>
                                    {' '}and{' '}
                                    <a href="#" className="hover:text-primary transition-colors" style={{ color: 'var(--text-main)' }}>Protocols</a>
                                    {' '}of the monolith.
                                </span>
                            </label>

                            <Button
                                type="submit"
                                disabled={!formData.agreeToTerms || !passwordsMatch || isLoading}
                                className="w-full md:w-auto md:mx-auto relative group px-12 py-4 overflow-hidden rounded-sm bg-primary border border-primary hover:bg-transparent transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 w-full bg-black/10 transition-all duration-[250ms] ease-out group-hover:w-0"></div>
                                <span className="relative font-mono text-xs font-bold tracking-[0.2em] uppercase text-white group-hover:text-primary transition-colors flex items-center justify-center gap-2">
                                    {isLoading ? 'Processing...' : 'Submit Request'}
                                    {!isLoading && <span className="material-symbols-outlined text-[1rem]">arrow_right_alt</span>}
                                </span>
                            </Button>
                        </div>

                        <div className="pt-8 text-center mt-6" style={{ borderTop: '1px solid var(--border-main)' }}>
                            <p className="text-xs font-mono tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                                Already Cleared?{' '}
                                <Link
                                    to="/login"
                                    className="hover:text-primary transition-colors ml-2 hover:underline underline-offset-4"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    Access Portal
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
