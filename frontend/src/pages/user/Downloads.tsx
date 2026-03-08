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

    const handleDownload = async (datasetId: string, type: 'raw' | 'cleaned', filename: string) => {
        try {
            const blob = type === 'raw'
                ? await datasetService.downloadRaw(datasetId)
                : await datasetService.downloadCleaned(datasetId);

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error(`Failed to download ${type} dataset:`, error);
            const errorMessage = error.response?.data?.detail || `Failed to download ${type} dataset. It may not exist yet.`;
            alert(errorMessage);
        }
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
                                        <button
                                            onClick={() => handleDownload(ds.id, 'raw', `${ds.name}_raw.csv`)}
                                            className="text-primary-blue hover:text-blue-800 text-sm font-medium cursor-pointer"
                                        >
                                            Download Raw
                                        </button>
                                        <span className="text-gray-300 dark:text-gray-600">|</span>
                                        <button
                                            onClick={() => handleDownload(ds.id, 'cleaned', `${ds.name}_cleaned.csv`)}
                                            className="text-green-600 hover:text-green-800 text-sm font-medium cursor-pointer"
                                        >
                                            Download Cleaned
                                        </button>
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
