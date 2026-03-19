import { useState } from 'react';
import { externalDbService, type DatabaseConnectionConfig } from '../../lib/api/external-db';

export default function ConnectDatabase() {
    const [config, setConfig] = useState<DatabaseConnectionConfig & { displayName: string }>({
        type: 'postgresql',
        database: '',
        host: '',
        port: 5432,
        username: '',
        password: '',
        displayName: ''
    });
    
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: name === 'port' ? parseInt(value) || '' : value }));
    };

    const handleProviderSelect = (type: DatabaseConnectionConfig['type']) => {
        setConfig(prev => ({ ...prev, type }));
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            await externalDbService.testConnection(config);
            setTestResult({ success: true, message: 'Successfully established a handshake with the database.' });
        } catch (error) {
            console.error('Connection failed:', error);
            setTestResult({ success: false, message: 'Connection failed. Please check your credentials.' });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden selection:bg-primary selection:text-on-primary">
            {/* Background Subtle Pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: "radial-gradient(var(--color-primary, #6C63FF) 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>
            
            <div className="flex-1 overflow-y-auto p-8 z-10 w-full">
                <div className="max-w-3xl mx-auto my-8 bg-surface-container-lowest dark:bg-surface-container rounded-xl dark:rounded-lg shadow-sm dark:shadow-2xl border border-outline-variant/10 dark:border-outline-variant overflow-hidden">
                    {/* Section Header */}
                    <div className="p-8 bg-surface-container-low/50 dark:bg-surface-container-high border-b border-outline-variant/10 dark:border-outline-variant">
                        <h2 className="text-2xl font-bold text-on-surface font-headline mb-2">Configure Integration</h2>
                        <p className="text-on-surface-variant text-sm font-body">Connect your cloud or local database to sync metadata and curate your data assets.</p>
                    </div>

                    <div className="p-8 space-y-10">
                        {/* Provider Selector */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4 font-label">1. Choose Database Provider</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Postgres */}
                                <button type="button" onClick={() => handleProviderSelect('postgresql')} className={`flex flex-col items-center justify-center p-4 rounded-xl dark:rounded-lg border-2 transition-all group ${config.type === 'postgresql' ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary' : 'border-outline-variant/20 dark:border-outline-variant/50 hover:border-primary/40 hover:bg-surface-container-low dark:hover:bg-surface-container-high text-on-surface-variant'}`}>
                                    <div className={`w-12 h-12 mb-3 bg-white dark:bg-surface-container-highest rounded-lg shadow-sm dark:shadow-inner flex items-center justify-center border ${config.type === 'postgresql' ? 'border-primary/20' : 'border-outline-variant/10 dark:border-outline-variant'}`}>
                                        <span className={`material-symbols-outlined text-3xl transition-colors ${config.type === 'postgresql' ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'}`} style={config.type === 'postgresql' ? { fontVariationSettings: "'FILL' 1" } : {}}>database</span>
                                    </div>
                                    <span className="text-xs font-bold font-headline">PostgreSQL</span>
                                </button>
                                
                                {/* MySQL */}
                                <button type="button" onClick={() => handleProviderSelect('mysql')} className={`flex flex-col items-center justify-center p-4 rounded-xl dark:rounded-lg border-2 transition-all group ${config.type === 'mysql' ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary' : 'border-outline-variant/20 dark:border-outline-variant/50 hover:border-primary/40 hover:bg-surface-container-low dark:hover:bg-surface-container-high text-on-surface-variant'}`}>
                                    <div className={`w-12 h-12 mb-3 bg-white dark:bg-surface-container-highest rounded-lg shadow-sm dark:shadow-inner flex items-center justify-center border ${config.type === 'mysql' ? 'border-primary/20' : 'border-outline-variant/10 dark:border-outline-variant'}`}>
                                        <span className={`material-symbols-outlined text-3xl transition-colors ${config.type === 'mysql' ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'}`} style={config.type === 'mysql' ? { fontVariationSettings: "'FILL' 1" } : {}}>storage</span>
                                    </div>
                                    <span className="text-xs font-bold font-headline">MySQL</span>
                                </button>
                                
                                {/* SQL Server */}
                                <button type="button" onClick={() => handleProviderSelect('mssql')} className={`flex flex-col items-center justify-center p-4 rounded-xl dark:rounded-lg border-2 transition-all group ${config.type === 'mssql' ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary' : 'border-outline-variant/20 dark:border-outline-variant/50 hover:border-primary/40 hover:bg-surface-container-low dark:hover:bg-surface-container-high text-on-surface-variant'}`}>
                                    <div className={`w-12 h-12 mb-3 bg-white dark:bg-surface-container-highest rounded-lg shadow-sm dark:shadow-inner flex items-center justify-center border ${config.type === 'mssql' ? 'border-primary/20' : 'border-outline-variant/10 dark:border-outline-variant'}`}>
                                        <span className={`material-symbols-outlined text-3xl transition-colors ${config.type === 'mssql' ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'}`} style={config.type === 'mssql' ? { fontVariationSettings: "'FILL' 1" } : {}}>dns</span>
                                    </div>
                                    <span className="text-xs font-bold font-headline">SQL Server</span>
                                </button>
                                
                                {/* SQLite */}
                                <button type="button" onClick={() => handleProviderSelect('sqlite')} className={`flex flex-col items-center justify-center p-4 rounded-xl dark:rounded-lg border-2 transition-all group ${config.type === 'sqlite' ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary' : 'border-outline-variant/20 dark:border-outline-variant/50 hover:border-primary/40 hover:bg-surface-container-low dark:hover:bg-surface-container-high text-on-surface-variant'}`}>
                                    <div className={`w-12 h-12 mb-3 bg-white dark:bg-surface-container-highest rounded-lg shadow-sm dark:shadow-inner flex items-center justify-center border ${config.type === 'sqlite' ? 'border-primary/20' : 'border-outline-variant/10 dark:border-outline-variant'}`}>
                                        <span className={`material-symbols-outlined text-3xl transition-colors ${config.type === 'sqlite' ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'}`} style={config.type === 'sqlite' ? { fontVariationSettings: "'FILL' 1" } : {}}>view_compact</span>
                                    </div>
                                    <span className="text-xs font-bold font-headline">SQLite</span>
                                </button>
                            </div>
                        </div>

                        {/* Credentials Form */}
                        <div className="space-y-6">
                            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant font-label">2. Connection Credentials</label>
                            {config.type === 'sqlite' ? (
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium text-on-surface mb-2">Display Name</label>
                                        <input
                                            name="displayName"
                                            value={config.displayName}
                                            onChange={handleChange}
                                            className="w-full bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/40 dark:border-outline-variant rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/10 dark:focus:ring-primary/20 focus:border-primary transition-all outline-none text-on-surface placeholder:text-on-surface-variant/50 dark:placeholder:text-on-surface-variant/50"
                                            placeholder="e.g. Local Analytics DB"
                                            type="text"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <label className="block text-sm font-medium text-on-surface mb-2">SQLite File Path / Database</label>
                                        <input
                                            name="database"
                                            value={config.database}
                                            onChange={handleChange}
                                            className="w-full bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/40 dark:border-outline-variant rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/10 dark:focus:ring-primary/20 focus:border-primary transition-all outline-none text-on-surface placeholder:text-on-surface-variant/50 dark:placeholder:text-on-surface-variant/50"
                                            placeholder="/path/to/database.sqlite"
                                            type="text"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-sm font-medium text-on-surface mb-2">Display Name</label>
                                        <input
                                            name="displayName"
                                            value={config.displayName}
                                            onChange={handleChange}
                                            className="w-full bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/40 dark:border-outline-variant rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/10 dark:focus:ring-primary/20 focus:border-primary transition-all outline-none text-on-surface placeholder:text-on-surface-variant/50 dark:placeholder:text-on-surface-variant/50"
                                            placeholder="e.g. Production Analytics"
                                            type="text"
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-sm font-medium text-on-surface mb-2">Host</label>
                                        <input
                                            name="host"
                                            value={config.host}
                                            onChange={handleChange}
                                            className="w-full bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/40 dark:border-outline-variant rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/10 dark:focus:ring-primary/20 focus:border-primary transition-all outline-none text-on-surface placeholder:text-on-surface-variant/50 dark:placeholder:text-on-surface-variant/50"
                                            placeholder="db.example.com"
                                            type="text"
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-sm font-medium text-on-surface mb-2">Port</label>
                                        <input
                                            name="port"
                                            value={config.port}
                                            onChange={handleChange}
                                            className="w-full bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/40 dark:border-outline-variant rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/10 dark:focus:ring-primary/20 focus:border-primary transition-all outline-none text-on-surface placeholder:text-on-surface-variant/50 dark:placeholder:text-on-surface-variant/50"
                                            placeholder={config.type === 'postgresql' ? '5432' : config.type === 'mysql' ? '3306' : '1433'}
                                            type="number"
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-sm font-medium text-on-surface mb-2">Database Name</label>
                                        <input
                                            name="database"
                                            value={config.database}
                                            onChange={handleChange}
                                            className="w-full bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/40 dark:border-outline-variant rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/10 dark:focus:ring-primary/20 focus:border-primary transition-all outline-none text-on-surface placeholder:text-on-surface-variant/50 dark:placeholder:text-on-surface-variant/50"
                                            placeholder="vizzy_core"
                                            type="text"
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label className="block text-sm font-medium text-on-surface mb-2">User</label>
                                        <input
                                            name="username"
                                            value={config.username}
                                            onChange={handleChange}
                                            className="w-full bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/40 dark:border-outline-variant rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/10 dark:focus:ring-primary/20 focus:border-primary transition-all outline-none text-on-surface placeholder:text-on-surface-variant/50 dark:placeholder:text-on-surface-variant/50"
                                            placeholder="admin_user"
                                            type="text"
                                        />
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-sm font-medium text-on-surface mb-2">Password</label>
                                        <div className="relative">
                                            <input
                                                name="password"
                                                value={config.password}
                                                onChange={handleChange}
                                                className="w-full bg-surface-container-lowest dark:bg-surface-container-low border border-outline-variant/40 dark:border-outline-variant rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary/10 dark:focus:ring-primary/20 focus:border-primary transition-all outline-none pr-10 text-on-surface"
                                                type="password"
                                                placeholder="••••••••••••"
                                            />
                                            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors">
                                                <span className="material-symbols-outlined text-xl" data-icon="visibility">visibility</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions & Status */}
                        <div className="pt-6 border-t border-outline-variant/10 dark:border-outline-variant space-y-6">
                            {/* Success Toast (Inline) or Error Toast */}
                            {testResult && (
                                <div className={`flex items-center gap-3 p-4 rounded-lg border ${testResult.success ? 'bg-secondary-container/20 dark:bg-secondary-container/10 border-secondary/20 dark:border-secondary/30' : 'bg-error-container/20 border-error/30'}`}>
                                    <span className={`material-symbols-outlined ${testResult.success ? 'text-secondary dark:text-primary' : 'text-error'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                                        {testResult.success ? 'check_circle' : 'error'}
                                    </span>
                                    <div className="flex-1">
                                        <p className={`text-sm font-semibold ${testResult.success ? 'text-on-secondary-container dark:text-on-surface' : 'text-error'}`}>
                                            {testResult.success ? 'Credentials verified' : 'Connection failed'}
                                        </p>
                                        <p className={`text-xs ${testResult.success ? 'text-on-secondary-container/80 dark:text-on-surface-variant' : 'text-error/80'}`}>
                                            {testResult.message}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col md:flex-row gap-4">
                                <button type="button" onClick={handleTestConnection} disabled={isTesting} className="flex-1 flex items-center justify-center gap-2 border-2 border-outline-variant/30 dark:border-outline-variant text-on-surface font-semibold py-3 px-6 rounded-xl dark:rounded-lg hover:bg-surface-container-low dark:hover:bg-surface-container-highest transition-all disabled:opacity-50">
                                    <span className="material-symbols-outlined">labs</span>
                                    {isTesting ? 'Testing...' : 'Test Connection'}
                                </button>
                                <button type="button" disabled className="flex-[2] bg-primary text-white dark:text-on-primary font-bold py-3 px-8 rounded-xl dark:rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-container dark:hover:opacity-90 transition-all flex items-center justify-center gap-3 group disabled:opacity-50 disabled:bg-surface-variant disabled:text-on-surface-variant disabled:shadow-none">
                                    <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">bolt</span>
                                    Connect & Ingest
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Security Footer */}
                    <div className="px-8 py-4 bg-surface-container-low/30 dark:bg-surface-container-high/50 border-t border-outline-variant/10 dark:border-outline-variant flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
                            <span className="material-symbols-outlined text-sm">lock</span>
                            End-to-End Encrypted
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] text-on-surface-variant font-medium">SSL REQUIRED</span>
                            <div className="w-8 h-4 bg-primary/20 rounded-full relative">
                                <div className="absolute right-1 top-1 w-2 h-2 bg-primary rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contextual Help */}
                <div className="mt-8 flex justify-center items-center gap-6 text-on-surface-variant">
                    <a className="flex items-center gap-2 text-xs font-semibold hover:text-primary transition-colors" href="#">
                        <span className="material-symbols-outlined text-sm">menu_book</span>
                        Documentation
                    </a>
                    <a className="flex items-center gap-2 text-xs font-semibold hover:text-primary transition-colors" href="#">
                        <span className="material-symbols-outlined text-sm">support_agent</span>
                        Contact Security Team
                    </a>
                    <a className="flex items-center gap-2 text-xs font-semibold hover:text-primary transition-colors" href="#">
                        <span className="material-symbols-outlined text-sm">shield</span>
                        Privacy Policy
                    </a>
                </div>
            </div>

            {/* Right Side Floating Info Card */}
            <div className="hidden xl:block fixed right-8 bottom-8 w-72 bg-white/60 dark:bg-surface-container/60 backdrop-blur-xl p-6 rounded-2xl dark:rounded-lg border border-white/20 dark:border-outline-variant shadow-2xl z-50">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-50 dark:bg-primary/10 rounded-lg">
                        <span className="material-symbols-outlined text-indigo-600 dark:text-primary">tips_and_updates</span>
                    </div>
                    <span className="font-bold text-sm font-headline text-slate-900 dark:text-on-surface">Setup Tip</span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
                    Ensure Vizzy's IP addresses are whitelisted in your firewall settings to allow the ingestion engine to reach your database.
                </p>
                <button className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                    View IP Whitelist
                    <span className="material-symbols-outlined text-sm">arrow_outward</span>
                </button>
            </div>
        </main>
    );
}
