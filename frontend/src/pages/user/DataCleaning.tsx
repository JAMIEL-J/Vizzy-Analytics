import { useState, useEffect } from 'react';
import { datasetService, type Dataset } from '../../lib/api/dataset';
import { cleaningService } from '../../services/cleaningService';
import type { InspectionReport } from '../../services/cleaningService';
import { HealthDashboard } from '../../components/cleaning/HealthDashboard';
import { RecommendationList } from '../../components/cleaning/RecommendationList';
import { toast } from 'react-hot-toast';

export default function DataCleaning() {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
    const [inspection, setInspection] = useState<InspectionReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // State for user selections
    const [selectedRecIds, setSelectedRecIds] = useState<string[]>([]);
    const [selectedStrategies, setSelectedStrategies] = useState<Record<string, string>>({});

    useEffect(() => {
        loadDatasets();
    }, []);

    useEffect(() => {
        if (selectedDatasetId) {
            loadInspection(selectedDatasetId);
        } else {
            setInspection(null);
        }
    }, [selectedDatasetId]);

    const loadDatasets = async () => {
        try {
            const data = await datasetService.listDatasets();
            setDatasets(data);
            if (data.length > 0) {
                // Determine which dataset to select initially? Maybe none to let user choose.
                // setSelectedDatasetId(data[0].id);
            }
        } catch (error) {
            console.error('Failed to load datasets:', error);
            toast.error('Failed to load datasets');
        }
    };

    const loadInspection = async (id: string, forceRescan = false) => {
        // Find the dataset to get the current version ID
        const dataset = datasets.find(d => d.id === id);
        if (!dataset || !dataset.current_version_id) {
            console.error('Dataset or version not found for ID:', id);
            // Optionally toast or set error state
            return;
        }

        const versionId = dataset.current_version_id;

        setIsLoading(true);
        setInspection(null);
        try {
            // First try to get existing inspection
            if (!forceRescan) {
                try {
                    const existing = await cleaningService.getInspection(versionId);
                    setInspection(existing);
                    setIsLoading(false);
                    return;
                } catch (e) {
                    // If 404, flow to runInspection
                }
            }

            // Run new inspection
            const newReport = await cleaningService.runInspection(versionId);
            setInspection(newReport);
        } catch (error) {
            console.error('Failed to inspect dataset:', error);
            toast.error('Failed to inspect dataset');
        } finally {
            setIsLoading(false);
        }
    };

    const handleExecuteCleaning = async () => {
        if (!selectedDatasetId || !inspection) return;

        const dataset = datasets.find(d => d.id === selectedDatasetId);
        if (!dataset || !dataset.current_version_id) {
            toast.error('Dataset version not found');
            return;
        }

        const versionId = dataset.current_version_id;

        if (selectedRecIds.length === 0) {
            toast('Please select at least one recommendation to apply.', { icon: 'ℹ️' });
            return;
        }

        if (!confirm('This will create a new version of your dataset with the selected fixes applied. Continue?')) {
            return;
        }

        setIsProcessing(true);
        try {
            // 1. Construct proposed_actions from user selections
            const actions: Record<string, any> = {
                fill_missing: [],
                drop_rows: [],
                remove_duplicates: false,
                cap_outliers: [],
            };

            const allRecs = inspection.issues_detected.recommendations || [];
            const selectedRecs = allRecs.filter(r => selectedRecIds.includes(r.id));

            for (const rec of selectedRecs) {
                const effectiveStrategy = selectedStrategies[rec.id] || rec.strategy;

                if (rec.issue_type === 'missing_values') {
                    if (effectiveStrategy === 'fill_mean') {
                        actions.fill_missing.push({ column: rec.column, method: 'mean' });
                    } else if (effectiveStrategy === 'fill_median') {
                        actions.fill_missing.push({ column: rec.column, method: 'median' });
                    } else if (effectiveStrategy === 'drop_rows') {
                        if (rec.column) actions.drop_rows.push(rec.column);
                    }
                } else if (rec.issue_type === 'duplicates') {
                    if (effectiveStrategy === 'remove_duplicates') {
                        actions.remove_duplicates = true;
                    }
                } else if (rec.issue_type === 'outliers') {
                    if (effectiveStrategy === 'cap_outliers') {
                        if (rec.column) actions.cap_outliers.push(rec.column);
                    }
                }
            }

            // 2. Create Plan (or fetch existing if 409)
            let plan;
            try {
                plan = await cleaningService.createPlan(versionId, actions);
            } catch (err: any) {
                if (err?.response?.status === 409) {
                    // Plan already exists — fetch it
                    plan = await cleaningService.getPlan(versionId);
                } else {
                    throw err;
                }
            }

            // 3. Approve Plan (skip if already approved)
            if (!plan.approved) {
                plan = await cleaningService.approvePlan(versionId, plan.id);
            }

            // 4. Execute Plan (apply fixes and save cleaned data)
            const result = await cleaningService.executePlan(versionId, plan.id);

            toast.success(
                `Cleaned successfully! ${result.rows_before} → ${result.rows_after} rows`
            );

            // 5. Refresh to show updated state
            window.location.reload();

        } catch (error) {
            console.error('Failed to execute cleaning:', error);
            toast.error('Failed to execute cleaning plan');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-[#0D0F12] h-full transition-colors duration-500">
            <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-primary-blue/10 dark:bg-primary-blue/20 flex items-center justify-center text-primary-blue dark:text-blue-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.691.31a2 2 0 01-1.611 0l-.691-.31a6 6 0 00-3.86-.517l-2.387.477a2 2 0 00-1.022.547l-.34.34a2 2 0 000 2.828l1.245 1.245A2 2 0 004.547 21H19.45a2 2 0 001.042-.293l1.245-1.245a2 2 0 000-2.828l-.34-.34z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Data Cleaning Studio</h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Analyze dataset integrity and implement automated corrections.</p>
                </div>

                <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative w-full sm:w-64 group">
                        <select
                            value={selectedDatasetId}
                            onChange={(e) => setSelectedDatasetId(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#16181D] border border-gray-200 dark:border-gray-800 rounded-xl appearance-none focus:ring-4 focus:ring-primary-blue/10 focus:border-primary-blue outline-none transition-all cursor-pointer font-bold text-gray-900 dark:text-white shadow-sm group-hover:border-primary-blue/30"
                            disabled={isLoading || isProcessing}
                        >
                            <option value="">Select Target Dataset</option>
                            {datasets.map(ds => (
                                <option key={ds.id} value={ds.id}>{ds.name}</option>
                            ))}
                        </select>
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2 2 2 2 2h12s2 0 2-2V7s0-2-2-2H6C4 5 4 7 4 7z M4 11h16 M4 15h16"></path></svg>
                        </div>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>

                    {selectedDatasetId && (
                        <button
                            onClick={() => loadInspection(selectedDatasetId, true)}
                            className="w-full sm:w-auto px-5 py-2.5 bg-gray-900 dark:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-black/20 dark:shadow-blue-500/20 hover:bg-black dark:hover:bg-blue-500 active:scale-95 transition-all text-sm"
                            disabled={isLoading || isProcessing}
                        >
                            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            Refresh Analysis
                        </button>
                    )}
                </div>
            </header>

            {selectedDatasetId ? (
                <>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mb-4"></div>
                            <p>Analyzing dataset quality...</p>
                        </div>
                    ) : inspection ? (
                        <div className="animate-fade-in-up">
                            {/* Health Dashboard */}
                            <HealthDashboard
                                healthScore={inspection.issues_detected?.health_score || 100}
                                riskLevel={inspection.risk_level}
                            />

                            {/* Recommendations */}
                            <div className="mb-6">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Detected Issues & Recommendations</h2>
                                <RecommendationList
                                    recommendations={inspection.issues_detected?.recommendations || []}
                                    onSelectionChange={(ids, strategies) => {
                                        setSelectedRecIds(ids);
                                        setSelectedStrategies(strategies);
                                    }}
                                />
                            </div>

                            {/* Actions Sticky Bar */}
                            {(inspection.issues_detected?.recommendations?.length || 0) > 0 && (
                                <div className="sticky bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-[#16181D]/80 backdrop-blur-md border-t border-gray-100 dark:border-gray-800 flex justify-end items-center gap-4 z-20 -mx-8 -mb-8 mt-12 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] transition-colors">
                                    <div className="flex flex-col items-end mr-4">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Selected Actions</span>
                                        <span className="text-gray-900 dark:text-white font-black">{selectedRecIds.length} recommendations</span>
                                    </div>
                                    <button
                                        onClick={handleExecuteCleaning}
                                        disabled={isProcessing || selectedRecIds.length === 0}
                                        className={`px-10 py-3.5 rounded-xl shadow-xl font-black text-white transition-all transform hover:scale-[1.02] active:scale-95 flex items-center gap-3 ${isProcessing || selectedRecIds.length === 0
                                            ? 'bg-gray-300 cursor-not-allowed shadow-none'
                                            : 'bg-primary-blue hover:bg-blue-600 shadow-primary-blue/20'
                                            }`}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                <span>Executing Cleaning...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                                <span>Apply {selectedRecIds.length} Corrections</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-center text-red-700">
                            Failed to load inspection results. Please try re-scanning.
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center py-20 bg-white dark:bg-[#16181D] rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400 transition-colors">
                    <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <p className="text-lg">Select a dataset to begin cleaning</p>
                </div>
            )}
        </div>
    );
}

// Add simple style if not present
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up {
    animation: fade-in-up 0.5s ease-out forwards;
  }
`;
document.head.appendChild(style);
