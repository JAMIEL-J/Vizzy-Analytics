import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { datasetService, type Dataset } from '../../lib/api/dataset';
import { Button } from '@/components/ui/button';

export default function DatasetList() {
    const [searchTerm, setSearchTerm] = useState('');
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDatasets();
    }, []);

    const loadDatasets = async () => {
        try {
            const data = await datasetService.listDatasets();
            setDatasets(data);
        } catch (error) {
            console.error('Failed to load datasets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this dataset?')) {
            try {
                await datasetService.deleteDataset(id);
                setDatasets(datasets.filter(d => d.id !== id));
            } catch (error) {
                console.error('Failed to delete dataset:', error);
                alert('Failed to delete dataset');
            }
        }
    };

    const filteredDatasets = datasets.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1 p-8 text-themed-main font-display antialiased relative selection:bg-primary selection:text-black">
            <div className="grain-overlay z-0"></div>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
                <div>
                    <h1 className="text-2xl font-light tracking-widest uppercase text-themed-main">My Datasets</h1>
                    <p className="text-themed-muted mt-1 font-mono text-xs tracking-wider">Manage and analyze your uploaded data files.</p>
                </div>
                <Link to="/user/upload" className="px-6 py-3 obsidian-card font-mono text-xs uppercase tracking-widest text-primary hover:bg-primary hover:text-black transition-colors flex items-center justify-center space-x-2 group shadow-[0_0_15px_rgba(255,105,51,0.2)]">
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    <span>Upload New Dataset</span>
                </Link>
            </div>

            {/* Filters */}
            <div className="glass-panel p-4 mb-6 flex items-center justify-between transition-colors relative z-10">
                <div className="relative w-full max-w-md">
                    <svg className="w-5 h-5 text-themed-muted absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <input
                        type="text"
                        placeholder="SEARCH DATASETS..."
                        className="w-full pl-10 pr-4 py-2 bg-transparent border border-border-main rounded-sm font-mono text-sm tracking-widest uppercase text-themed-main placeholder-gray-600 focus:border-primary/50 outline-none transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex space-x-2">
                    <Button type="button" variant="ghost" className="px-4 py-2 obsidian-card font-mono text-xs uppercase tracking-widest text-themed-muted hover:text-primary transition-colors hover:border-primary/50 flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                        <span>Filter</span>
                    </Button>
                    <Button type="button" variant="ghost" className="px-4 py-2 obsidian-card font-mono text-xs uppercase tracking-widest text-themed-muted hover:text-primary transition-colors hover:border-primary/50 flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path></svg>
                        <span>Sort</span>
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel overflow-hidden transition-colors relative z-10 p-0 border-border-main">
                <div className="overflow-x-auto">
                    <table className="w-full text-themed-main font-mono">
                        <thead className="bg-bg-card border-b border-border-main">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-bold text-themed-muted uppercase tracking-widest">Name</th>
                                <th className="px-6 py-4 text-left text-[10px] font-bold text-themed-muted uppercase tracking-widest">Created</th>
                                <th className="px-6 py-4 text-left text-[10px] font-bold text-themed-muted uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-right text-[10px] font-bold text-themed-muted uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-main">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-themed-muted text-xs tracking-widest uppercase">Loading datasets...</td>
                                </tr>
                            ) : filteredDatasets.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-themed-muted text-xs tracking-widest uppercase">No datasets found. Upload one to get started.</td>
                                </tr>
                            ) : (
                                filteredDatasets.map((dataset) => (
                                    <tr key={dataset.id} className="hover:bg-bg-hover transition-colors group cursor-default">
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-bg-card text-primary rounded-sm flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-lg">database</span>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-bold text-themed-main tracking-widest">{dataset.name}</div>
                                                    {dataset.description && <div className="text-[10px] text-themed-muted tracking-wider mt-1">{dataset.description.toUpperCase()}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-themed-muted tracking-wider">
                                            {dataset.created_at
                                                ? new Date(dataset.created_at.endsWith('Z') ? dataset.created_at : dataset.created_at + 'Z').toLocaleString('en-IN', {
                                                    timeZone: 'Asia/Kolkata',
                                                    year: 'numeric', month: 'short', day: '2-digit',
                                                    hour: '2-digit', minute: '2-digit', hour12: true
                                                })
                                                : '-'
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-[10px] font-bold tracking-widest uppercase rounded-sm ${dataset.is_active ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-red-500/20 text-red-500 border border-red-500/30'}`}>
                                                {dataset.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            <div className="flex items-center justify-end space-x-4 transition-opacity">
                                                <Link to="/user/chat" className="text-themed-muted hover:text-primary transition-colors" title="Chat">
                                                    <span className="material-symbols-outlined text-xl">forum</span>
                                                </Link>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(dataset.id)} className="text-themed-muted hover:text-red-500 transition-colors" title="Delete">
                                                    <span className="material-symbols-outlined text-xl">delete</span>
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
