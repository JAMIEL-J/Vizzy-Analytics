import { useState, useEffect } from 'react';
import { datasetService, type Dataset } from '../../lib/api/dataset';
import { toast } from 'react-hot-toast';

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
            toast.error('Failed to load datasets');
        }
    };

    const handleDownload = async (datasetId: string, type: 'raw' | 'cleaned', filename: string) => {
        try {
            const toastId = toast.loading(`Downloading ${type} dataset...`);
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
            toast.success(`Successfully downloaded ${filename}`, { id: toastId });
        } catch (error: any) {
            console.error(`Failed to download ${type} dataset:`, error);
            const errorMessage = error.response?.data?.detail || `Failed to download ${type} dataset. It may not exist yet.`;
            toast.error(errorMessage);
        }
    };

    const formatFileSize = (bytes: number | undefined) => {
        if (!bytes) return 'Unknown Size';
        const kb = bytes / 1024;
        if (kb < 1024) return `${kb.toFixed(1)} KB`;
        const mb = kb / 1024;
        if (mb < 1024) return `${mb.toFixed(1)} MB`;
        return `${(mb / 1024).toFixed(2)} GB`;
    };

    return (
        <main className="flex-1 flex flex-col min-w-0 bg-background text-on-surface antialiased h-full font-body relative">
            <div className="absolute inset-0 z-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(var(--color-primary, #6C63FF) 1px, transparent 1px)", backgroundSize: "24px 24px" }}></div>
            
            <div className="p-8 space-y-8 overflow-y-auto bg-background flex-1 relative z-10 animate-fade-in">
                {/* Header Section */}
                <div className="flex justify-between items-end flex-wrap gap-4">
                    <div className="space-y-1">
                        <h3 className="text-2xl font-headline font-bold text-on-surface">Exported Files</h3>
                        <p className="text-on-surface-variant text-sm">Manage and download your curated dataset versions.</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="px-4 py-2 bg-surface-container-lowest dark:bg-surface-container border border-outline-variant/20 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-surface-container-low transition-colors text-on-surface">
                            <span className="material-symbols-outlined text-sm">filter_list</span>
                            Filters
                        </button>
                        <button 
                            onClick={loadDatasets}
                            className="px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
                        >
                            <span className="material-symbols-outlined text-sm">sync</span>
                            Refresh Portal
                        </button>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-surface-container-low dark:bg-surface-container rounded-xl overflow-hidden border border-outline-variant/10 dark:border-outline-variant/20 shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-surface-container-high/50 dark:bg-surface-container-highest/50">
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Dataset Name</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Upload Date</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Size</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">Status</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/10 bg-surface-container-lowest dark:bg-surface-container">
                                {datasets.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant text-sm italic">
                                            No datasets available.
                                        </td>
                                    </tr>
                                ) : (
                                    datasets.map((ds, idx) => (
                                        <tr key={ds.id} className="hover:bg-surface-container-low/50 dark:hover:bg-surface-container-highest/30 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${idx % 2 === 0 ? 'bg-primary-fixed dark:bg-primary/10 text-primary' : 'bg-secondary-fixed dark:bg-secondary/10 text-secondary'}`}>
                                                        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                            {idx % 2 === 0 ? 'description' : 'table_chart'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-on-surface text-sm max-w-[200px] truncate" title={ds.name}>{ds.name}</p>
                                                        <p className="text-xs text-on-surface-variant">ID: {ds.id.substring(0,8)}...</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-sm text-on-surface-variant">
                                                {ds.created_at
                                                    ? new Date(ds.created_at.endsWith('Z') ? ds.created_at : ds.created_at + 'Z').toLocaleString('en-US', {
                                                        month: 'short', day: '2-digit', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })
                                                    : '-'
                                                }
                                            </td>
                                            <td className="px-6 py-5 text-sm font-medium text-on-surface">
                                                {(ds as any).size ? formatFileSize((ds as any).size) : 'Unknown'}
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container dark:bg-secondary-container/20 text-on-secondary-container dark:text-secondary text-[10px] font-bold border dark:border-secondary/20 border-transparent">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-secondary dark:bg-secondary"></span>
                                                    Ready
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center justify-end gap-3">
                                                    <button 
                                                        onClick={() => handleDownload(ds.id, 'raw', `${ds.name}_raw.csv`)}
                                                        className="px-4 py-1.5 text-xs font-semibold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 dark:hover:bg-primary/10 transition-all whitespace-nowrap"
                                                    >
                                                        Download Raw
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDownload(ds.id, 'cleaned', `${ds.name}_cleaned.csv`)}
                                                        className="px-4 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg flex items-center gap-2 hover:bg-primary-container dark:hover:opacity-90 transition-all whitespace-nowrap"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">download</span>
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

                {/* Bento Stats Grid - Static layout mapping */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-2 bg-surface-container-lowest dark:bg-surface-container p-6 rounded-xl border border-outline-variant/10 dark:border-outline-variant/20 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <h4 className="text-sm font-bold text-on-surface">Monthly Bandwidth Usage</h4>
                            <span className="text-xs text-on-surface-variant font-medium">85% of 500GB limit</span>
                        </div>
                        <div className="h-3 w-full bg-surface-container-low dark:bg-surface-container-highest rounded-full overflow-hidden mb-6">
                            <div className="h-full bg-primary w-[85%] rounded-full shadow-[0_0_10px_rgba(108,99,255,0.4)]"></div>
                        </div>
                        <div className="flex justify-between text-[11px] font-bold text-on-surface-variant uppercase tracking-tighter">
                            <span>Current: 425 GB</span>
                            <span>Expires in 6 days</span>
                        </div>
                    </div>
                    <div className="bg-surface-container-lowest dark:bg-surface-container p-6 rounded-xl border border-outline-variant/10 dark:border-outline-variant/20 shadow-sm flex flex-col justify-between">
                        <span className="material-symbols-outlined text-secondary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                        <div>
                            <p className="text-2xl font-bold text-on-surface font-headline">{datasets.length * 2}</p>
                            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mt-1">Total Exports</p>
                        </div>
                    </div>
                    <div className="bg-surface-container-lowest dark:bg-surface-container p-6 rounded-xl border border-outline-variant/10 dark:border-outline-variant/20 shadow-sm flex flex-col justify-between">
                        <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_done</span>
                        <div>
                            <p className="text-2xl font-bold text-on-surface font-headline">{(datasets.length * 1.5).toFixed(1)} GB</p>
                            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mt-1">Processed Data</p>
                        </div>
                    </div>
                </div>

                {/* Footer Meta */}
                <div className="flex justify-between items-center py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-t border-outline-variant/10 dark:border-outline-variant/20">
                    <span>Data stored in Regional Tier 1 Node</span>
                    <div className="flex gap-6">
                        <button className="hover:text-primary transition-colors">Encryption Protocol</button>
                        <button className="hover:text-primary transition-colors">Usage Logs</button>
                        <button className="hover:text-primary transition-colors">Clear History</button>
                    </div>
                </div>
            </div>
        </main>
    );
}
