import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { datasetService, uploadService } from '../../lib/api/dataset';
import { Button } from '@/components/ui/button';

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
        setProgress(10); // Start progress

        try {
            // Step 1: Create Dataset Metadata
            const dataset = await datasetService.createDataset(selectedFile.name, 'Uploaded via Web Interface');
            setProgress(30);

            // Step 2: Upload File
            // Note: In a real app we'd pass an onUploadProgress callback to axios here
            // asking the service to support it. For now we just await the promise.
            // Simulating progress for UX during await
            const progressInterval = setInterval(() => {
                setProgress(prev => Math.min(prev + 5, 90));
            }, 200);

            await uploadService.uploadFile(dataset.id, selectedFile);

            clearInterval(progressInterval);
            setProgress(100);
            setIsUploading(false);
            setShowSchema(true);
            // In a real app, backend might return schema immediately or we fetch it.
            // Current backend infers schema on upload. We could fetch dataset details to show it?
            // For now, simpler UX: just show success and "Go to Dashboard"

        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please try again.');
            setIsUploading(false);
            setProgress(0);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const removeFile = () => {
        setFile(null);
        setProgress(0);
        setShowSchema(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="flex-1 p-8 text-themed-main font-display antialiased relative selection:bg-primary selection:text-black">
            <div className="grain-overlay z-0"></div>
            {/* Header */}
            <div className="max-w-4xl mx-auto flex items-center justify-between mb-8 relative z-10">
                <div>
                    <h1 className="text-2xl font-light tracking-widest uppercase text-themed-main">Upload Data</h1>
                    <p className="text-themed-muted mt-1 font-mono text-xs tracking-wider">Import your dataset to get started</p>
                </div>
                <Link to="/user/dashboard" className="px-4 py-2 obsidian-card font-mono text-[10px] uppercase tracking-widest text-themed-muted hover:text-primary transition-colors hover:border-primary/50 flex items-center gap-2">← Back to Dashboard</Link>
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Drop Zone */}
                {!file && (
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border border-dashed p-12 text-center transition-colors cursor-pointer glass-panel ${isDragging ? 'border-primary bg-primary/5' : 'border-white/20 hover:border-primary/50'}`}
                    >
                        <svg className="w-16 h-16 mx-auto text-primary mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        <h3 className="text-xl font-light tracking-widest uppercase text-themed-main mb-2">Drag & Drop your file here</h3>
                        <p className="font-mono text-xs text-themed-muted mb-8 uppercase tracking-widest">or click to browse</p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".csv,.xlsx,.json"
                            className="hidden"
                            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                        />
                        <Button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-8 py-3 bg-primary text-black font-mono text-xs uppercase tracking-widest font-bold hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(255,105,51,0.2)]"
                        >
                            Choose File
                        </Button>
                        <p className="font-mono text-[10px] text-themed-muted mt-8 uppercase tracking-widest">Supported formats: CSV, Excel (.xlsx) • Max size: 50MB</p>
                    </div>
                )}


                {/* File Info & Progress */}
                {file && (
                    <div className="mt-6 glass-panel p-8 shadow-sm transition-colors border-border-main">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-bg-card rounded-sm flex items-center justify-center text-primary">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                </div>
                                <div>
                                    <p className="font-bold tracking-widest uppercase text-themed-main">{file?.name}</p>
                                    <p className="font-mono text-[10px] text-themed-muted uppercase tracking-widest mt-1">{file && formatFileSize(file.size)}</p>
                                </div>
                            </div>
                            {!isUploading && !showSchema && (
                                <Button type="button" variant="ghost" size="icon" onClick={removeFile} className="text-themed-muted hover:text-red-500 transition-colors">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </Button>
                            )}
                        </div>

                        <div className="mb-4">
                            <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest mb-3">
                                <span className="text-themed-muted">{progress < 100 ? 'Uploading & Processing...' : 'Upload Complete'}</span>
                                <span className="text-primary font-bold">{progress}%</span>
                            </div>
                            <div className="w-full bg-black/50 border border-border-main h-1 overflow-hidden">
                                <div
                                    className="bg-primary h-full transition-all duration-300 shadow-[0_0_10px_rgba(255,105,51,0.5)]"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Success Actions */}
                        {showSchema && (
                            <div className="animate-fade-in-up">
                                <hr className="my-8 border-border-main" />
                                <div className="flex flex-col items-center justify-center py-6">
                                    <div className="w-16 h-16 border border-primary/20 bg-primary/5 rounded-sm flex items-center justify-center mb-6 text-primary shadow-[0_0_15px_rgba(255,105,51,0.1)]">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    </div>
                                    <h4 className="font-light tracking-widest uppercase text-themed-main mb-2 text-xl">Upload Successful!</h4>
                                    <p className="font-mono text-xs text-themed-muted mb-10 uppercase tracking-widest text-center">Your dataset has been processed and is ready for analysis.</p>

                                    <div className="flex space-x-6 w-full max-w-sm">
                                        <Button type="button" variant="ghost" onClick={() => navigate('/user/datasets')} className="flex-1 px-4 py-3 obsidian-card font-mono text-[10px] uppercase tracking-widest text-themed-muted hover:text-primary transition-colors hover:border-primary/50 text-center">
                                            View Datasets
                                        </Button>
                                        <Button type="button" onClick={() => navigate('/user/chat')} className="flex-1 px-4 py-3 bg-primary text-black font-mono text-[10px] uppercase tracking-widest font-bold hover:bg-primary/90 transition-colors shadow-[0_0_15px_rgba(255,105,51,0.2)] text-center">
                                            Start Chatting →
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Upload Tips */}
                {!file && (
                    <div className="mt-8 grid md:grid-cols-3 gap-6">
                        <div className="glass-panel p-6 transition-colors group hover:border-primary/30">
                            <div className="w-12 h-12 bg-bg-card rounded-sm flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </div>
                            <h4 className="font-bold tracking-widest uppercase text-themed-main mb-2 text-sm">Instant Processing</h4>
                            <p className="font-mono text-xs text-themed-muted tracking-wider">Automatic schema detection and type inference</p>
                        </div>
                        <div className="glass-panel p-6 transition-colors group hover:border-primary/30">
                            <div className="w-12 h-12 bg-bg-card rounded-sm flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                            </div>
                            <h4 className="font-bold tracking-widest uppercase text-themed-main mb-2 text-sm">Secure Upload</h4>
                            <p className="font-mono text-xs text-themed-muted tracking-wider">Your data is encrypted and stored securely</p>
                        </div>
                        <div className="glass-panel p-6 transition-colors group hover:border-primary/30">
                            <div className="w-12 h-12 bg-bg-card rounded-sm flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                            </div>
                            <h4 className="font-bold tracking-widest uppercase text-themed-main mb-2 text-sm">Version Control</h4>
                            <p className="font-mono text-xs text-themed-muted tracking-wider">All uploads are versioned and trackable</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
