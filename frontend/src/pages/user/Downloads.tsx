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
        <div className="flex-1 overflow-y-auto p-8 text-white font-display antialiased relative selection:bg-primary selection:text-black">
            <div className="grain-overlay z-0"></div>
            <div className="max-w-6xl mx-auto relative z-10">
                <header className="mb-8">
                    <h1 className="text-2xl font-light tracking-widest uppercase text-white">Downloads</h1>
                    <p className="text-gray-400 mt-1 font-mono text-xs tracking-wider">Download your raw and cleaned datasets</p>
                </header>

                <div className="glass-panel overflow-hidden transition-colors border-white/5">
                    <table className="w-full text-white font-mono">
                        <thead className="bg-white/5 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dataset Name</th>
                                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Upload Date</th>
                                <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {datasets.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500 text-xs tracking-widest uppercase">No datasets available.</td>
                                </tr>
                            ) : (
                                datasets.map(ds => (
                                    <tr key={ds.id} className="hover:bg-white/5 transition-colors group cursor-default">
                                        <td className="px-6 py-5 whitespace-nowrap font-bold text-white tracking-widest text-sm">{ds.name}</td>
                                        <td className="px-6 py-5 whitespace-nowrap font-mono text-xs text-gray-400 tracking-wider text-sm">{ds.created_at ? new Date(ds.created_at).toLocaleDateString() : '-'}</td>
                                        <td className="px-6 py-5 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end space-x-3 transition-opacity">
                                                <button
                                                    onClick={() => handleDownload(ds.id, 'raw', `${ds.name}_raw.csv`)}
                                                    className="px-4 py-2 obsidian-card font-mono text-[10px] uppercase tracking-widest text-gray-400 hover:text-primary transition-colors hover:border-primary/50 text-center flex-1"
                                                >
                                                    Download Raw
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(ds.id, 'cleaned', `${ds.name}_cleaned.csv`)}
                                                    className="px-4 py-2 bg-primary text-black font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(255,105,51,0.2)] text-center flex-1"
                                                >
                                                    Download Cleaned
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
