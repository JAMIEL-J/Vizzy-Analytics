import { useState, useEffect, useCallback } from 'react';
import { datasetService, type Dataset } from '../../lib/api/dataset';
import { cleaningService } from '../../services/cleaningService';
import type { InspectionReport } from '../../services/cleaningService';
import { HealthDashboard } from '../../components/cleaning/HealthDashboard';
import { RecommendationList } from '../../components/cleaning/RecommendationList';
import { toast } from 'react-hot-toast';

const EMPTY_ARRAY: any[] = [];

export default function DataCleaning() {
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
    const [inspection, setInspection] = useState<InspectionReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // State for user selections
    const [selectedRecIds, setSelectedRecIds] = useState<string[]>([]);
    const [selectedStrategies, setSelectedStrategies] = useState<Record<string, string>>({});

    const handleSelectionChange = useCallback((ids: string[], strategies: Record<string, string>) => {
        setSelectedRecIds(prev => JSON.stringify(prev) === JSON.stringify(ids) ? prev : ids);
        setSelectedStrategies(prev => JSON.stringify(prev) === JSON.stringify(strategies) ? prev : strategies);
    }, []);

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
        } catch (error) {
            console.error('Failed to load datasets:', error);
            toast.error('Failed to load datasets');
        }
    };

    const loadInspection = async (id: string, forceRescan = false) => {
        const dataset = datasets.find(d => d.id === id);
        if (!dataset || !dataset.current_version_id) {
            console.error('Dataset or version not found for ID:', id);
            return;
        }

        const versionId = dataset.current_version_id;
        setIsLoading(true);
        setInspection(null);
        
        try {
            if (!forceRescan) {
                try {
                    const existing = await cleaningService.getInspection(versionId);
                    setInspection(existing);
                    setIsLoading(false);
                    return;
                } catch (e) {
                    // Flow to runInspection
                }
            }

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

            let plan;
            try {
                plan = await cleaningService.createPlan(versionId, actions);
            } catch (err: any) {
                if (err?.response?.status === 409) {
                    plan = await cleaningService.getPlan(versionId);
                } else {
                    throw err;
                }
            }

            if (!plan.approved) {
                plan = await cleaningService.approvePlan(versionId, plan.id);
            }

            const result = await cleaningService.executePlan(versionId, plan.id);

            toast.success(
                `Cleaned successfully! ${result.rows_before} → ${result.rows_after} rows`
            );

            window.location.reload();

        } catch (error) {
            console.error('Failed to execute cleaning:', error);
            toast.error('Failed to execute cleaning plan');
        } finally {
            setIsProcessing(false);
        }
    };

    const recommendationsList = inspection?.issues_detected?.recommendations || EMPTY_ARRAY;

    return (
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative selection:bg-primary selection:text-white">
            <div className="flex-1 overflow-y-auto p-8 pb-32 bg-background">
                <div className="max-w-7xl mx-auto space-y-8">
                    
                    {/* Header Controls */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-surface-container-lowest dark:bg-surface rounded-xl p-6 shadow-sm border border-outline-variant/10 dark:border-outline-variant">
                        <div>
                            <h2 className="text-xl font-bold text-on-surface font-headline flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-2xl">cleaning_services</span>
                                Data Cleaning Studio
                            </h2>
                            <p className="text-on-surface-variant text-sm mt-1">Select a dataset to analyze integrity and implement automated corrections.</p>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <select
                                    value={selectedDatasetId}
                                    onChange={(e) => setSelectedDatasetId(e.target.value)}
                                    className="w-full pl-10 pr-10 py-2.5 bg-surface-container-low dark:bg-surface-container border border-outline-variant/50 dark:border-outline-variant rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                                    disabled={isLoading || isProcessing}
                                >
                                    <option value="">Select Target Dataset...</option>
                                    {datasets.map(ds => (
                                        <option key={ds.id} value={ds.id}>{ds.name}</option>
                                    ))}
                                </select>
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary material-symbols-outlined text-[18px]">dataset</span>
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant material-symbols-outlined text-[18px] pointer-events-none">expand_content</span>
                            </div>
                            {selectedDatasetId && (
                                <button
                                    onClick={() => loadInspection(selectedDatasetId, true)}
                                    disabled={isLoading || isProcessing}
                                    className="px-4 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>sync</span>
                                    {isLoading ? 'Scanning...' : 'Rescan'}
                                </button>
                            )}
                        </div>
                    </div>

                    {!selectedDatasetId ? (
                        <div className="py-24 text-center border-2 border-dashed border-outline-variant/30 dark:border-outline-variant rounded-2xl bg-surface-container-low/30 dark:bg-surface/50">
                            <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">analytics</span>
                            <h3 className="text-lg font-bold text-on-surface font-headline mb-2">No Dataset Selected</h3>
                            <p className="text-on-surface-variant text-sm max-w-sm mx-auto">Please choose a dataset from the dropdown above to run a quality inspection and view automated cleaning recommendations.</p>
                        </div>
                    ) : isLoading ? (
                        <div className="py-24 text-center">
                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-on-surface-variant font-medium">Running deep quality inspection...</p>
                        </div>
                    ) : inspection ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in-up">
                            {/* Health Dashboard (Left Panel) */}
                            <div className="lg:col-span-5 space-y-8">
                                <HealthDashboard
                                    healthScore={inspection.issues_detected?.health_score || 100}
                                    riskLevel={inspection.risk_level}
                                    issues={inspection.issues_detected || {}}
                                />

                                <section className="bg-surface-container-low dark:bg-surface-container rounded-xl p-6 border border-outline-variant/10 dark:border-outline-variant">
                                    <h4 className="text-sm font-bold font-headline mb-4 flex items-center gap-2 text-on-surface">
                                        <span className="material-symbols-outlined text-primary text-lg" data-icon="info">info</span>
                                        Curator Insights
                                    </h4>
                                    <p className="text-sm text-on-surface-variant leading-relaxed">
                                        Automated scan found potential quality regressions. We've listed tailored optimization strategies in the recommendations panel to restore data integrity.
                                    </p>
                                </section>
                            </div>

                            {/* Recommendations (Right Panel) */}
                            <div className="lg:col-span-7 space-y-4">
                                <RecommendationList
                                    recommendations={recommendationsList}
                                    onSelectionChange={handleSelectionChange}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-error bg-error-container/20 rounded-xl border border-error/30">
                            Failed to load inspection results.
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Execution Bar */}
            {inspection && (inspection.issues_detected?.recommendations?.length || 0) > 0 && (
                <div className="fixed bottom-8 left-0 lg:left-64 right-8 z-50 pointer-events-none">
                    <div className="max-w-7xl mx-auto flex justify-center">
                        <div className="bg-inverse-surface dark:bg-surface-container-high text-inverse-on-surface dark:text-on-surface px-6 py-4 rounded-2xl shadow-2xl flex flex-col md:flex-row items-center gap-4 md:gap-8 pointer-events-auto border border-white/10 dark:border-outline-variant backdrop-blur-md">
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-primary border-2 border-inverse-surface dark:border-surface-container-high flex items-center justify-center text-[10px] font-bold text-white z-10">
                                        {selectedRecIds.length}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-surface-container border-2 border-inverse-surface dark:border-surface-container-high flex items-center justify-center text-[10px] font-bold text-on-surface-variant">
                                        {inspection.issues_detected?.recommendations?.length || 0}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-inverse-on-surface dark:text-on-surface">{selectedRecIds.length} Issues Selected</p>
                                    <p className="text-[10px] opacity-70 uppercase font-medium">Ready to optimize dataset</p>
                                </div>
                            </div>
                            <div className="hidden md:block h-8 w-px bg-white/10 dark:bg-outline-variant"></div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button 
                                    className="flex-1 md:flex-none px-4 py-2 text-sm font-bold hover:bg-white/5 dark:hover:bg-surface-variant rounded-xl transition-colors uppercase tracking-wide text-inverse-on-surface dark:text-on-surface"
                                    onClick={() => setSelectedRecIds([])}
                                    disabled={selectedRecIds.length === 0}
                                >
                                    Clear
                                </button>
                                <button 
                                    className="flex-1 md:flex-none bg-primary hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 uppercase tracking-wide"
                                    onClick={handleExecuteCleaning}
                                    disabled={isProcessing || selectedRecIds.length === 0}
                                >
                                    {isProcessing ? 'Executing...' : 'Apply Corrections'}
                                    <span className={`material-symbols-outlined text-sm ${isProcessing ? 'animate-spin' : ''}`} data-icon="auto_fix_high">
                                        {isProcessing ? 'sync' : 'auto_fix_high'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
