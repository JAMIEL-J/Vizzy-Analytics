import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { authApi } from '../../lib/api/auth';
import Grainient from '@/components/ui/backgrounds/Grainient';


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
        <div className="min-h-screen flex items-center justify-center font-sans relative overflow-hidden bg-transparent px-6 py-8 transition-colors duration-500">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <Grainient
                    color1="#150f14"
                    color2="#27a6d8"
                    color3="#352626"
                    timeSpeed={5}
                    colorBalance={0}
                    warpStrength={1}
                    warpFrequency={5}
                    warpSpeed={1.9}
                    warpAmplitude={50}
                    blendAngle={0}
                    blendSoftness={0}
                    rotationAmount={200}
                    noiseScale={1}
                    grainAmount={0}
                    grainScale={0.2}
                    grainAnimated={false}
                    contrast={2}
                    gamma={2}
                    saturation={2.05}
                    centerX={0}
                    centerY={0}
                    zoom={1.05}
                />
            </div>

            {/* Premium Card Container */}
            <div className="max-w-md lg:max-w-xl w-full relative z-10">
                {/* Glass Card */}
                <div className="bg-white/95 dark:bg-[#111827]/90 backdrop-blur-lg border border-white/20 dark:border-gray-800 rounded-2xl shadow-2xl p-8 sm:p-10 transition-colors duration-500">
                    {/* Admin Login Link */}
                    <Link
                        to="/admin/login"
                        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary-blue transition mb-6"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                        </svg>
                        Admin login
                    </Link>

                    {/* Logo with Gradient */}
                    <div className="flex items-center justify-center mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary-blue to-accent-cyan rounded-2xl blur-xl opacity-50"></div>
                            <div className="relative w-16 h-16 bg-gradient-to-br from-primary-blue to-accent-cyan rounded-2xl flex items-center justify-center shadow-lg">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary-blue to-accent-cyan bg-clip-text text-transparent mb-2">
                            Welcome Back
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-semibold bg-gradient-to-r from-primary-blue to-accent-cyan bg-clip-text text-transparent hover:opacity-80 transition">
                                Sign up
                            </Link>
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            {/* Email */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Email address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path>
                                        </svg>
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="appearance-none relative block w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 placeholder-gray-400 text-gray-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition"
                                        placeholder="you@example.com"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                        </svg>
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="appearance-none relative block w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 placeholder-gray-400 text-gray-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-primary-blue focus:border-transparent transition"
                                        placeholder="Enter your password"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 text-primary-blue focus:ring-primary-blue border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Remember me
                                </label>
                            </div>

                            <div className="text-sm">
                                <a href="#" className="font-semibold bg-gradient-to-r from-primary-blue to-accent-cyan bg-clip-text text-transparent hover:opacity-80 transition">
                                    Forgot password?
                                </a>
                            </div>
                        </div>

                        {/* Submit Button with Gradient */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl text-base font-bold text-white bg-gradient-to-r from-primary-blue via-accent-cyan to-primary-blue bg-size-200 bg-pos-0 hover:bg-pos-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-blue transition-all duration-500 transform hover:scale-[1.02] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            style={{
                                backgroundSize: '200% auto',
                                backgroundPosition: 'left center'
                            }}
                        >
                            {isLoading ? 'Signing in...' : 'Sign in'}
                            {!isLoading && (
                                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                                </svg>
                            )}
                        </button>

                        {/* Divider */}
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-[#111827] text-gray-500 dark:text-gray-400">Or continue with</span>
                            </div>
                        </div>

                        {/* Social Login Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                className="w-full inline-flex justify-center items-center gap-2 py-3 px-4 border-2 border-gray-200 rounded-xl shadow-sm bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span className="hidden sm:inline">Google</span>
                            </button>
                            <button
                                type="button"
                                className="w-full inline-flex justify-center items-center gap-2 py-3 px-4 border-2 border-gray-200 rounded-xl shadow-sm bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                                <span className="hidden sm:inline">GitHub</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
