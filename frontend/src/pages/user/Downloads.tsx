import { useState, useEffect } from 'react';
import { datasetService, type Dataset } from '../../lib/api/dataset';

export default function Downloads() {
    const [datasets, setDatasets] = useState<Dataset[]>([]);

    useEffect(() => {
        loadDatasets();
    }, []);

    const loadDatasets = async () => {
        try {
            const data = await datasetService.listDatasets();
            setDatasets(data);
        } catch (error) {
            console.error('Failed to load datasets:', error);
        }
    };

    const getDownloadUrl = (datasetId: string, versionId: string = 'latest', type: 'raw' | 'cleaned') => {
        // Construct URL directly for now, or use a helper that gets signed URL
        // Assuming simple static route proxy
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
        // Note: version logic is simplified here. In real app, we iterate versions.
        // If we don't have version ID, we might need an endpoint "latest"
        return `${baseUrl}/datasets/${datasetId}/versions/${versionId}/download/${type}`;
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-[#0D0F12] transition-colors duration-300">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-navy dark:text-white">Downloads</h1>
                <p className="text-gray-600 dark:text-gray-400">Download your raw and cleaned datasets</p>
            </header>

            <div className="bg-white dark:bg-[#16181D] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-[#1C1F26] border-b border-gray-200 dark:border-gray-800">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dataset Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Upload Date</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {datasets.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No datasets available.</td>
                            </tr>
                        ) : (
                            datasets.map(ds => (
                                <tr key={ds.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-navy dark:text-white">{ds.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">{new Date(ds.created_at || '').toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-3">
                                        <a
                                            href={getDownloadUrl(ds.id, 'latest', 'raw')}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary-blue hover:text-blue-800 text-sm font-medium"
                                        >
                                            Download Raw
                                        </a>
                                        <span className="text-gray-300 dark:text-gray-600">|</span>
                                        <a
                                            href={getDownloadUrl(ds.id, 'latest', 'cleaned')}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                                        >
                                            Download Cleaned
                                        </a>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
