import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store/authStore';

export default function UserLayout() {
    const { logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const linkClasses = (path: string) => `
        flex items-center rounded-lg transition-all duration-500 ease-in-out
        ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3 gap-3'}
        ${location.pathname === path
            ? 'bg-primary-blue text-white shadow-lg shadow-blue-500/30'
            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'}
    `;

    const spanClasses = `transition-all duration-500 ease-in-out origin-left whitespace-nowrap overflow-hidden ${isCollapsed ? 'max-w-0 opacity-0 scale-95 ml-0' : 'max-w-48 opacity-100 scale-100 ml-0'}`;

    return (
        <div className="flex h-screen overflow-hidden bg-white dark:bg-[#0D0F12] transition-colors duration-500">
            {/* Sidebar */}
            <aside
                className={`
                    flex flex-col h-full bg-gray-50 dark:bg-[#16181D] border-r border-gray-200 dark:border-white/5 transition-all duration-500 ease-in-out z-30 relative overflow-hidden
                    ${isCollapsed ? 'w-20' : 'w-72'}
                `}
            >
                {/* Fixed Toggle Button Position */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white dark:bg-[#16181D] text-gray-400 hover:text-primary-blue rounded-full p-1.5 shadow-lg border border-gray-200 dark:border-white/10 z-50 flex items-center justify-center transition-all duration-300 ease-in-out hover:scale-110"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    <svg className={`w-4 h-4 transition-transform duration-500 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>

                <div className={`flex flex-col h-full transition-all duration-500 ${isCollapsed ? 'px-0 py-6' : 'p-6'}`}>
                    {/* Logo Section - Static */}
                    <div className={`flex items-center mb-10 shrink-0 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-tr from-primary-blue to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                </svg>
                            </div>
                            <span className={`text-xl font-bold text-gray-900 dark:text-white ml-3 transition-all duration-500 ease-in-out origin-left whitespace-nowrap overflow-hidden ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-48 opacity-100'}`}>Vizzy</span>
                        </div>
                    </div>

                    {/* Navigation - Scrollable */}
                    <nav className={`flex-1 overflow-y-auto min-h-0 space-y-2 scrollbar-hide hover:scrollbar-default ${isCollapsed ? 'px-3' : 'px-0'}`}>
                        <Link to="/user/dashboard" title={isCollapsed ? "My Analytics" : ""} className={linkClasses('/user/dashboard')}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path>
                            </svg>
                            <span className={spanClasses}>My Analytics</span>
                        </Link>
                        <Link to="/user/datasets" title={isCollapsed ? "Datasets" : ""} className={linkClasses('/user/datasets')}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21 3.582 4 8 4s8-1.79 8-4"></path>
                            </svg>
                            <span className={spanClasses}>Datasets</span>
                        </Link>
                        <Link to="/user/upload" title={isCollapsed ? "Upload Data" : ""} className={linkClasses('/user/upload')}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                            </svg>
                            <span className={spanClasses}>Upload Data</span>
                        </Link>
                        <Link to="/user/chat" title={isCollapsed ? "Chat Analytics" : ""} className={linkClasses('/user/chat')}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
                            </svg>
                            <span className={spanClasses}>Chat Analytics</span>
                        </Link>
                        <Link to="/user/cleaning" title={isCollapsed ? "Data Cleaning" : ""} className={linkClasses('/user/cleaning')}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
                            </svg>
                            <span className={spanClasses}>Data Cleaning</span>
                        </Link>
                        <Link to="/user/connect-db" title={isCollapsed ? "Connect DB" : ""} className={linkClasses('/user/connect-db')}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21 3.582 4 8 4s8-1.79 8-4"></path>
                            </svg>
                            <span className={spanClasses}>Connect DB</span>
                        </Link>
                        <Link to="/user/downloads" title={isCollapsed ? "Downloads" : ""} className={linkClasses('/user/downloads')}>
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                            </svg>
                            <span className={spanClasses}>Downloads</span>
                        </Link>
                    </nav>
                </div>

                {/* Logout - Static at bottom */}
                <div className={`mt-auto shrink-0 border-t border-gray-200 dark:border-white/10 transition-all duration-500 ${isCollapsed ? 'px-3 py-6' : 'p-6'}`}>
                    <button
                        onClick={handleLogout}
                        title={isCollapsed ? "Logout" : ""}
                        className={`
                            flex items-center rounded-lg text-gray-600 dark:text-gray-300 hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-500 ease-in-out w-full
                            ${isCollapsed ? 'justify-center p-3' : 'px-4 py-3 gap-3'}
                        `}
                    >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                        </svg>
                        <span className={spanClasses}>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
                <main className="flex-1 overflow-y-auto bg-gray-50/30 dark:bg-[#0a1017] transition-colors duration-300 custom-scrollbar">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
