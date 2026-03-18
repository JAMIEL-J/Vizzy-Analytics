import { useState, useEffect } from 'react';
import { datasetService, type Dataset } from '../../lib/api/dataset';
import { Button } from '@/components/ui/button';

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
        <div className="flex-1 overflow-y-auto p-8 text-themed-main font-display antialiased relative selection:bg-primary selection:text-black">
            <div className="grain-overlay z-0"></div>
            <div className="max-w-6xl mx-auto relative z-10">
                <header className="mb-8">
                    <h1 className="text-2xl font-light tracking-widest uppercase text-themed-main">Downloads</h1>
                    <p className="text-themed-muted mt-1 font-mono text-xs tracking-wider">Download your raw and cleaned datasets</p>
                </header>

                <div className="glass-panel overflow-hidden transition-colors border-border-main">
                    <table className="w-full text-themed-main font-mono">
                        <thead className="bg-bg-card border-b border-border-main">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-bold text-themed-muted uppercase tracking-widest">Dataset Name</th>
                                <th className="px-6 py-4 text-left text-[10px] font-bold text-themed-muted uppercase tracking-widest">Upload Date</th>
                                <th className="px-6 py-4 text-right text-[10px] font-bold text-themed-muted uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-main">
                            {datasets.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-themed-muted text-xs tracking-widest uppercase">No datasets available.</td>
                                </tr>
                            ) : (
                                datasets.map(ds => (
                                    <tr key={ds.id} className="hover:bg-bg-hover transition-colors group cursor-default">
                                        <td className="px-6 py-5 whitespace-nowrap font-bold text-themed-main tracking-widest text-sm">{ds.name}</td>
                                        <td className="px-6 py-5 whitespace-nowrap font-mono text-xs text-themed-muted tracking-wider">
                                            {ds.created_at
                                                ? new Date(ds.created_at.endsWith('Z') ? ds.created_at : ds.created_at + 'Z').toLocaleString('en-IN', {
                                                    timeZone: 'Asia/Kolkata',
                                                    year: 'numeric', month: 'short', day: '2-digit',
                                                    hour: '2-digit', minute: '2-digit', hour12: true
                                                })
                                                : '-'
                                            }
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end space-x-3 transition-opacity">
                                                <Button
                                                    type="button"
                                                    onClick={() => handleDownload(ds.id, 'raw', `${ds.name}_raw.csv`)}
                                                    className="px-4 py-2 obsidian-card font-mono text-[10px] uppercase tracking-widest text-themed-muted hover:text-primary transition-colors hover:border-primary/50 text-center flex-1"
                                                    variant="ghost"
                                                >
                                                    Download Raw
                                                </Button>
                                                <Button
                                                    type="button"
                                                    onClick={() => handleDownload(ds.id, 'cleaned', `${ds.name}_cleaned.csv`)}
                                                    className="px-4 py-2 bg-primary text-black font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(255,105,51,0.2)] text-center flex-1"
                                                >
                                                    Download Cleaned
                                                </Button>
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
