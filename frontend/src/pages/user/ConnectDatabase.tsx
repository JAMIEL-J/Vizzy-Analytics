import { useState } from 'react';
import { externalDbService, type DatabaseConnectionConfig } from '../../lib/api/external-db';

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
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-[#0D0F12] transition-colors duration-300">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-navy dark:text-white">Connect Database</h1>
                <p className="text-gray-600 dark:text-gray-400">Import data directly from your external databases</p>
            </header>

            <div className="max-w-2xl bg-white dark:bg-[#16181D] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 transition-colors">
                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Database Type</label>
                        <select
                            name="type"
                            value={config.type}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#0D0F12] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none transition-colors"
                        >
                            <option value="postgresql">PostgreSQL</option>
                            <option value="mysql">MySQL</option>
                            <option value="mssql">SQL Server</option>
                            <option value="sqlite">SQLite</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Host</label>
                            <input
                                type="text"
                                name="host"
                                value={config.host}
                                onChange={handleChange}
                                placeholder="localhost"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#0D0F12] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Port</label>
                            <input
                                type="number"
                                name="port"
                                value={config.port}
                                onChange={handleChange}
                                placeholder="5432"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#0D0F12] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Database Name</label>
                        <input
                            type="text"
                            name="database"
                            value={config.database}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#0D0F12] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none transition-colors"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={config.username}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#0D0F12] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={config.password}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-[#0D0F12] text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {testResult && (
                        <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {testResult.message}
                        </div>
                    )}

                    <div className="flex justify-end space-x-4 mt-4">
                        <button
                            onClick={handleTestConnection}
                            disabled={isTesting}
                            className="px-6 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                            {isTesting ? 'Testing...' : 'Test Connection'}
                        </button>
                        <button disabled className="px-6 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                            Connect & Ingest
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
