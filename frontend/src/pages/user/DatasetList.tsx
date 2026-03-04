import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { datasetService, type Dataset } from '../../lib/api/dataset';

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
        <div className="flex-1 p-8 bg-white dark:bg-[#0D0F12] transition-colors duration-500">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Datasets</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and analyze your uploaded data files.</p>
                </div>
                <Link to="/user/upload" className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center space-x-2 shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    <span>Upload New Dataset</span>
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-[#16181D] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-6 flex items-center justify-between transition-colors">
                <div className="relative w-full max-w-md">
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    <input
                        type="text"
                        placeholder="Search datasets..."
                        className="w-full pl-10 pr-4 py-2 bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-blue focus:border-transparent outline-none transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex space-x-2">
                    <button className="px-3 py-2 bg-white dark:bg-[#16181D] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm flex items-center space-x-2 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                        <span>Filter</span>
                    </button>
                    <button className="px-3 py-2 bg-white dark:bg-[#16181D] border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm flex items-center space-x-2 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path></svg>
                        <span>Sort</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#16181D] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-gray-900 dark:text-gray-100">
                        <thead className="bg-gray-50 dark:bg-[#1C1F26] border-b border-gray-200 dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">Loading datasets...</td>
                                </tr>
                            ) : filteredDatasets.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No datasets found. Upload one to get started.</td>
                                </tr>
                            ) : (
                                filteredDatasets.map((dataset) => (
                                    <tr key={dataset.id} className="hover:bg-gray-50 dark:hover:bg-blue-900/10 transition group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-blue-50 dark:bg-blue-900/30 text-primary-blue rounded-lg flex items-center justify-center">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">{dataset.name}</div>
                                                    {dataset.description && <div className="text-xs text-gray-500 dark:text-gray-400">{dataset.description}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{dataset.created_at ? new Date(dataset.created_at).toLocaleDateString() : '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${dataset.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'}`}>
                                                {dataset.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link to="/user/chat" className="text-accent-cyan hover:text-cyan-700" title="Chat">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                                </Link>
                                                <button onClick={() => handleDelete(dataset.id)} className="text-red-400 hover:text-red-600" title="Delete">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
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
