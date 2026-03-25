import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { datasetService, uploadService } from '../../lib/api/dataset';

const DUCKDB_POLL_INTERVAL_MS = 2000;
const DUCKDB_MAX_POLLS = 30;

type UploadPhase = 'idle' | 'uploading' | 'building' | 'ready' | 'failed';

export default function FileUpload() {
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [showSchema, setShowSchema] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadPhase, setUploadPhase] = useState<UploadPhase>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [failureMessage, setFailureMessage] = useState('');
    const [pollCount, setPollCount] = useState(0);
    const [uploadedDatasetId, setUploadedDatasetId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isMountedRef = useRef(true);
    const navigate = useNavigate();

    useEffect(() => {
        // React Strict Mode can remount components in development.
        // Reset mounted flag on each mount so polling does not short-circuit.
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const toActionableFailureMessage = (backendError?: string | null) => {
        const normalized = (backendError || '').trim();
        const shortError = normalized.length > 160 ? `${normalized.slice(0, 160)}...` : normalized;

        const base = 'DuckDB optimization failed. Re-upload the dataset to retry, or continue to Dashboard in limited mode.';
        return shortError ? `${base} Details: ${shortError}` : base;
    };

    const pollDuckdbReadiness = async (datasetId: string) => {
        setUploadPhase('building');
        setStatusMessage('Optimizing dataset for full analytics accuracy...');
        setPollCount(0);

        for (let attempt = 1; attempt <= DUCKDB_MAX_POLLS; attempt++) {
            if (!isMountedRef.current) return;
            setPollCount(attempt);

            try {
                const status = await datasetService.getDuckdbStatus(datasetId);

                if (!isMountedRef.current) return;

                if (status.status === 'ready' || status.ready) {
                    setProgress(100);
                    setUploadPhase('ready');
                    setStatusMessage('Dataset is ready for full analytics.');
                    setShowSchema(true);
                    return;
                }

                if (status.status === 'failed') {
                    setUploadPhase('failed');
                    setFailureMessage(toActionableFailureMessage(status.error));
                    setStatusMessage('Optimization failed.');
                    return;
                }

                // building
                setProgress(prev => Math.min(prev + 1, 99));
                setStatusMessage('Building analytical index. This usually takes a few seconds...');
            } catch (err: any) {
                setUploadPhase('failed');
                setFailureMessage(toActionableFailureMessage(err?.response?.data?.detail || err?.message));
                setStatusMessage('Status check failed.');
                return;
            }

            await sleep(DUCKDB_POLL_INTERVAL_MS);
        }

        if (!isMountedRef.current) return;
        setUploadPhase('failed');
        setStatusMessage('Optimization timed out.');
        setFailureMessage(
            'DuckDB optimization is taking longer than expected (over 60 seconds). Re-upload to retry, or continue to Dashboard in limited mode while indexing completes.'
        );
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFile = (selectedFile: File) => {
        setFile(selectedFile);
        startUpload(selectedFile);
    };

    const startUpload = async (selectedFile: File) => {
        setUploadPhase('uploading');
        setStatusMessage('Uploading dataset and creating version...');
        setFailureMessage('');
        setShowSchema(false);
        setUploadedDatasetId(null);
        setPollCount(0);
        setIsUploading(true);
        setProgress(10);
        let progressInterval: ReturnType<typeof setInterval> | null = null;

        try {
            const dataset = await datasetService.createDataset(selectedFile.name, 'Uploaded via Web Interface');
            setUploadedDatasetId(dataset.id);
            sessionStorage.setItem('vizzy.dashboard.selectedDatasetId', dataset.id);
            setProgress(30);

            progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 5, 90));
            }, 200);

            await uploadService.uploadFile(dataset.id, selectedFile);

            if (progressInterval) {
                clearInterval(progressInterval);
            }
            setIsUploading(false);
            setProgress(92);
            await pollDuckdbReadiness(dataset.id);

        } catch (error) {
            if (progressInterval) {
                clearInterval(progressInterval);
            }
            console.error('Upload failed:', error);
            setUploadPhase('failed');
            setFailureMessage('Upload failed. Please retry the upload. If this persists, check file format/size or contact support with the dataset name.');
            setStatusMessage('Upload failed.');
            setIsUploading(false);
            setProgress(0);
        }
    };

    return (
        <main className="flex-1 overflow-hidden w-full relative bg-background flex flex-col">
            {/* Main Content Wrapper */}
            <div className="flex-1 overflow-y-auto w-full z-10 relative flex flex-col">
                <div className="p-8 lg:p-12 max-w-5xl mx-auto w-full flex-1 flex flex-col">
                {/* Header Decor */}
                <div className="mb-12 w-full">
                    <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface">Import Data Source</h2>
                    <p className="text-on-surface-variant font-body mt-1">Ready your workspace with new insights.</p>
                </div>
                
                {/* Centered Upload Container */}
                <div className="flex-1 flex flex-col items-center justify-center w-full">
                    <div className="max-w-2xl w-full flex flex-col items-center z-10">
                        {!file && (
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full h-80 flex flex-col items-center justify-center transition-all cursor-pointer group mb-12 rounded-xl border-2 border-dashed
                        ${isDragging ? 'bg-surface-container border-primary/50 text-primary scale-[1.02]' : 'bg-surface-container-low border-primary/20 hover:bg-surface-container'}`}
                        style={{
                            backgroundImage: !isDragging ? `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='12' ry='12' stroke='%233525CD' stroke-width='2' stroke-dasharray='12%2c 16' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")` : 'none',
                            border: !isDragging ? 'none' : ''
                        }}
                    >
                        <div className="w-16 h-16 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform dark:bg-surface-container dark:border dark:border-primary/20">
                            <span className="material-symbols-outlined text-primary text-3xl">cloud_upload</span>
                        </div>
                        <h3 className="font-headline text-xl font-semibold text-on-surface mb-2">Drop your data here</h3>
                        <p className="text-on-surface-variant font-body text-sm px-8 text-center">(CSV, XLSX, XLS, JSON, XML, Parquet files supported up to 100MB)</p>
                        
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".csv,.xlsx,.xls,.json,.xml,.parquet"
                            className="hidden"
                            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                        />

                        <button type="button" className="mt-8 px-6 py-2.5 bg-primary text-on-primary font-label text-xs font-bold uppercase tracking-widest rounded-lg shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
                            Select File
                        </button>
                    </div>
                )}

                {/* Progress Bar Section */}
                {file && !showSchema && (
                    <div className="w-full bg-surface-container-low dark:bg-surface-container rounded-xl p-6 mb-12 border dark:border-outline-variant/30 border-transparent transition-all">
                        <div className="flex justify-between items-end mb-4">
                            <div className="space-y-1">
                                <span className="text-xs font-label font-bold text-primary uppercase tracking-widest">
                                    {uploadPhase === 'uploading' && 'Uploading'}
                                    {uploadPhase === 'building' && 'Building DuckDB'}
                                    {uploadPhase === 'failed' && 'Needs Attention'}
                                    {uploadPhase === 'idle' && 'Preparing'}
                                    {uploadPhase === 'ready' && 'Ready'}
                                </span>
                                <p className="text-sm font-body font-medium text-on-surface">{file.name}</p>
                            </div>
                            <span className="text-xs font-label font-bold text-on-surface-variant">{progress}%</span>
                        </div>
                        
                        {/* Progress Track */}
                        <div className="h-2 w-full bg-outline-variant/30 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-primary rounded-full transition-all duration-300 dark:shadow-[0_0_8px_rgba(108,99,255,0.6)]" 
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs text-on-surface-variant font-body">
                            {uploadPhase !== 'failed' && (
                                <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                            )}
                            <span>
                                {uploadPhase === 'uploading' && (isUploading ? 'Uploading and processing records...' : 'Finalizing upload...')}
                                {uploadPhase === 'building' && `${statusMessage} (polling every 2s, attempt ${pollCount}/${DUCKDB_MAX_POLLS})`}
                                {uploadPhase === 'failed' && statusMessage}
                                {uploadPhase === 'idle' && 'Preparing upload...'}
                                {uploadPhase === 'ready' && 'Ready'}
                            </span>
                        </div>

                        {uploadPhase === 'failed' && (
                            <div className="mt-4 rounded-lg border border-red-300/60 bg-red-50/60 dark:bg-red-900/20 p-4">
                                <p className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-widest mb-2">DuckDB Build Failed</p>
                                <p className="text-sm text-red-700 dark:text-red-200 leading-relaxed">{failureMessage}</p>
                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => file && startUpload(file)}
                                        className="w-full py-2.5 bg-primary text-on-primary font-label text-xs font-bold uppercase tracking-widest rounded-lg shadow hover:brightness-110 transition-all"
                                    >
                                        Retry Upload
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/user/dashboard')}
                                        className="w-full py-2.5 bg-surface-container text-on-surface font-label text-xs font-bold uppercase tracking-widest rounded-lg border border-outline-variant hover:bg-surface-container-high transition-colors"
                                    >
                                        Continue Limited Mode
                                    </button>
                                </div>
                            </div>
                        )}

                        {uploadPhase === 'building' && uploadedDatasetId && (
                            <div className="mt-4 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => navigate('/user/dashboard')}
                                    className="text-xs font-bold uppercase tracking-widest text-primary hover:underline"
                                >
                                    Open Dashboard While Building
                                </button>
                            </div>
                        )}
                    </div>
                )}
                    </div>
                </div>
                </div>
            </div>

            {/* Success Modal (Overlaid Style) */}
            {showSchema && (
                <div className="fixed inset-0 bg-on-surface/5 dark:bg-background/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-surface-container-lowest dark:bg-surface p-10 rounded-xl shadow-[0_12px_40px_rgba(20,27,44,0.08)] dark:shadow-2xl max-w-sm w-full border border-outline-variant/20 dark:border-outline-variant/50 flex flex-col items-center text-center">
                        <div className="w-16 h-16 dark:w-20 dark:h-20 rounded-full bg-secondary-container flex items-center justify-center mb-6 dark:border dark:border-secondary/20">
                            <span className="material-symbols-outlined text-on-secondary-container dark:text-on-secondary-container text-3xl dark:text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        </div>
                        <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">Upload Complete</h2>
                        <p className="text-on-surface-variant font-body text-sm mb-8 leading-relaxed">
                            "{file?.name}" has been successfully indexed and is ready for analysis.
                        </p>
                        <div className="grid grid-cols-1 gap-3 w-full">
                            <button onClick={() => navigate('/user/chat')} className="w-full py-3 dark:py-4 bg-primary text-on-primary font-label dark:font-headline text-xs font-bold uppercase tracking-widest rounded-lg dark:rounded shadow-lg shadow-primary/10 dark:shadow-primary/20 hover:brightness-110 transition-all">
                                Start Chatting
                            </button>
                            <button onClick={() => navigate('/user/datasets')} className="w-full py-3 dark:py-4 bg-surface-container-low dark:bg-surface-container text-on-surface font-label dark:font-headline text-xs font-bold uppercase tracking-widest rounded-lg dark:rounded dark:border dark:border-outline-variant hover:bg-surface-container dark:hover:bg-surface-container-highest transition-colors">
                                View Datasets
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ambient Background Texture */}
            <div className="absolute -top-24 -right-24 w-96 h-96 dark:w-[32rem] dark:h-[32rem] bg-primary/5 rounded-full blur-3xl dark:blur-[120px] pointer-events-none z-0"></div>
            <div className="absolute -bottom-24 -left-24 w-96 h-96 dark:w-[32rem] dark:h-[32rem] bg-secondary/5 rounded-full blur-3xl dark:blur-[120px] pointer-events-none z-0"></div>
        </main>
    );
}
