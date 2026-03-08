import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { authApi } from '../../lib/api/auth';

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
            await authApi.register({ email: formData.email, password: formData.password });
            // Registration successful - redirect to login
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
        <div className="min-h-screen bg-background-dark text-white font-display overflow-x-hidden antialiased flex items-center justify-center px-4 py-12">
            <div className="grain-overlay"></div>

            <div className="max-w-4xl w-full relative z-10">
                <Link to="/" className="inline-flex items-center gap-2 text-xs font-mono tracking-widest uppercase text-gray-500 hover:text-primary transition-colors mb-8 group">
                    <span className="material-symbols-outlined text-[1rem] group-hover:-translate-x-1 transition-transform">arrow_left</span>
                    Return to Void
                </Link>

                <div className="obsidian-card p-8 md:p-12 rounded-lg relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded border border-white/10 bg-white/5 text-primary mb-6">
                            <span className="material-symbols-outlined text-2xl">person_add</span>
                        </div>
                        <h2 className="text-3xl font-light tracking-tight mb-2">REQUEST<br /><span className="text-gray-500 italic font-serif text-2xl">CLEARANCE</span></h2>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 border border-red-500/30 bg-red-500/10 rounded text-red-400 text-xs font-mono uppercase tracking-widest text-center">
                            {error}
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                            <div>
                                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">Designation (Name)</label>
                                <input
                                    name="name"
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full bg-black border border-white/10 rounded-sm px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors font-sans text-sm"
                                    placeholder="Architect One"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">Communication Link (Email)</label>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full bg-black border border-white/10 rounded-sm px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors font-sans text-sm"
                                    placeholder="architect@epoch.com"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">Access Key (Password)</label>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full bg-black border border-white/10 rounded-sm px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors font-sans text-sm"
                                    placeholder="Create Key"
                                />
                                {formData.password && (
                                    <div className="mt-3">
                                        <div className="flex gap-1">
                                            <div className={`h-[2px] flex-1 ${passwordStrength === 'weak' ? 'bg-red-500' : passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                                            <div className={`h-[2px] flex-1 ${passwordStrength === 'medium' || passwordStrength === 'strong' ? passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-green-500' : 'bg-white/10'}`}></div>
                                            <div className={`h-[2px] flex-1 ${passwordStrength === 'strong' ? 'bg-green-500' : 'bg-white/10'}`}></div>
                                        </div>
                                        <p className={`text-[10px] font-mono tracking-widest uppercase mt-2 ${passwordStrength === 'weak' ? 'text-red-500' : passwordStrength === 'medium' ? 'text-yellow-500' : 'text-green-500'}`}>
                                            Security Level: {passwordStrength}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">Verify Access Key</label>
                                <input
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className={`w-full bg-black border ${formData.confirmPassword && !passwordsMatch ? 'border-red-500' : 'border-white/10'} rounded-sm px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors font-sans text-sm`}
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
                                    className="w-4 h-4 mt-0.5 bg-black border border-white/20 rounded-sm text-primary focus:ring-primary focus:ring-offset-background-dark appearance-none checked:bg-primary checked:border-primary relative"
                                />
                                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                                    I accept the <a href="#" className="text-white hover:text-primary transition-colors">Directives</a> and <a href="#" className="text-white hover:text-primary transition-colors">Protocols</a> of the monolith.
                                </span>
                            </label>

                            <button
                                type="submit"
                                disabled={!formData.agreeToTerms || !passwordsMatch || isLoading}
                                className="w-full md:w-auto md:mx-auto relative group px-12 py-4 overflow-hidden rounded-sm bg-primary border border-primary hover:bg-transparent transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 w-full bg-black/10 transition-all duration-[250ms] ease-out group-hover:w-0"></div>
                                <span className="relative font-mono text-xs font-bold tracking-[0.2em] uppercase text-black group-hover:text-primary transition-colors flex items-center justify-center gap-2">
                                    {isLoading ? 'Processing...' : 'Submit Request'}
                                    {!isLoading && <span className="material-symbols-outlined text-[1rem]">arrow_right_alt</span>}
                                </span>
                            </button>
                        </div>

                        <div className="pt-8 border-t border-white/10 text-center mt-6">
                            <p className="text-xs font-mono tracking-widest text-gray-500 uppercase">
                                Already Cleared? <Link to="/login" className="text-white hover:text-primary transition-colors ml-2 hover:underline underline-offset-4">Access Portal</Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
