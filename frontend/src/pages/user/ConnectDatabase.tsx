import { useState } from 'react';
import { externalDbService, type DatabaseConnectionConfig } from '../../lib/api/external-db';
import { Button } from '@/components/ui/button';

export default function ConnectDatabase() {
    const [config, setConfig] = useState<DatabaseConnectionConfig>({
        type: 'postgresql',
        database: '',
        host: '',
        port: 5432,
        username: '',
        password: ''
    });
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: name === 'port' ? parseInt(value) : value }));
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            await externalDbService.testConnection(config);
            setTestResult({ success: true, message: 'Connection successful!' });
        } catch (error) {
            console.error('Connection failed:', error);
            setTestResult({ success: false, message: 'Connection failed. Please check your credentials.' });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 text-themed-main font-display antialiased relative selection:bg-primary selection:text-black">
            <div className="grain-overlay z-0"></div>
            <header className="mb-8 relative z-10">
                <h1 className="text-2xl font-light tracking-widest uppercase text-themed-main">Connect Database</h1>
                <p className="text-themed-muted mt-1 font-mono text-xs tracking-wider">Import data directly from your external databases</p>
            </header>

            <div className="max-w-2xl glass-panel relative z-10 p-8">
                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block font-mono text-[10px] tracking-widest uppercase text-themed-muted mb-2">Database Type</label>
                        <select
                            name="type"
                            value={config.type}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-black/50 border border-border-main rounded-sm font-mono text-sm tracking-widest uppercase text-themed-main focus:border-primary/50 outline-none transition-colors appearance-none"
                        >
                            <option value="postgresql">PostgreSQL</option>
                            <option value="mysql">MySQL</option>
                            <option value="mssql">SQL Server</option>
                            <option value="sqlite">SQLite</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block font-mono text-[10px] tracking-widest uppercase text-themed-muted mb-2">Host</label>
                            <input
                                type="text"
                                name="host"
                                value={config.host}
                                onChange={handleChange}
                                placeholder="LOCALHOST"
                                className="w-full px-4 py-3 bg-black/50 border border-border-main rounded-sm font-mono text-sm tracking-widest text-themed-main placeholder-gray-600 focus:border-primary/50 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block font-mono text-[10px] tracking-widest uppercase text-themed-muted mb-2">Port</label>
                            <input
                                type="number"
                                name="port"
                                value={config.port}
                                onChange={handleChange}
                                placeholder="5432"
                                className="w-full px-4 py-3 bg-black/50 border border-border-main rounded-sm font-mono text-sm tracking-widest text-themed-main placeholder-gray-600 focus:border-primary/50 outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block font-mono text-[10px] tracking-widest uppercase text-themed-muted mb-2">Database Name</label>
                        <input
                            type="text"
                            name="database"
                            value={config.database}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-black/50 border border-border-main rounded-sm font-mono text-sm tracking-widest text-themed-main focus:border-primary/50 outline-none transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block font-mono text-[10px] tracking-widest uppercase text-themed-muted mb-2">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={config.username}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-black/50 border border-border-main rounded-sm font-mono text-sm tracking-widest text-themed-main focus:border-primary/50 outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block font-mono text-[10px] tracking-widest uppercase text-themed-muted mb-2">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={config.password}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-black/50 border border-border-main rounded-sm font-mono text-sm tracking-widest text-themed-main focus:border-primary/50 outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {testResult && (
                        <div className={`p-4 rounded-sm font-mono text-xs uppercase tracking-wider border ${testResult.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                            {testResult.message}
                        </div>
                    )}

                    <div className="flex justify-end space-x-4 mt-6">
                        <Button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={isTesting}
                            className="px-6 py-3 obsidian-card font-mono text-xs uppercase tracking-widest text-themed-muted hover:text-primary transition-colors hover:border-primary/50 disabled:opacity-50"
                            variant="ghost"
                        >
                            {isTesting ? 'Testing...' : 'Test Connection'}
                        </Button>
                        <Button type="button" disabled className="px-6 py-3 bg-primary text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:bg-gray-800 disabled:text-themed-muted leading-none">
                            Connect & Ingest
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
