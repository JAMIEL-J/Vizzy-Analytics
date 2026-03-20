import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { datasetService, uploadService } from '../../lib/api/dataset';

export default function FileUpload() {
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [showSchema, setShowSchema] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

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
        setIsUploading(true);
        setProgress(10);

        try {
            const dataset = await datasetService.createDataset(selectedFile.name, 'Uploaded via Web Interface');
            setProgress(30);

            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 5, 90));
            }, 200);

            await uploadService.uploadFile(dataset.id, selectedFile);

            clearInterval(progressInterval);
            setProgress(100);
            setIsUploading(false);
            setShowSchema(true);

        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please try again.');
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
                                <span className="text-xs font-label font-bold text-primary uppercase tracking-widest">Uploading</span>
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
                            <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                            <span>{isUploading ? 'Processing & cleaning records...' : 'Finalizing...'}</span>
                        </div>
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
