import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
        <div className="flex-1 p-8 bg-white dark:bg-[#0D0F12] transition-colors duration-500">
            {/* Header */}
            <div className="max-w-4xl mx-auto flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Data</h1>
                    <p className="text-gray-600 dark:text-gray-400">Import your dataset to get started</p>
                </div>
                <Link to="/user/dashboard" className="text-primary-blue hover:text-blue-700 text-sm font-medium">← Back to Dashboard</Link>
            </div>

            <div className="max-w-4xl mx-auto">
                {/* Drop Zone */}
                {!file && (
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-12 text-center transition cursor-pointer bg-white dark:bg-[#16181D] ${isDragging ? 'border-primary-blue bg-blue-50 dark:bg-blue-900/10' : 'border-gray-300 dark:border-gray-800 hover:border-primary-blue'}`}
                    >
                        <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Drag & Drop your file here</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">or click to browse</p>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".csv,.xlsx,.json"
                            className="hidden"
                            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            Choose File
                        </button>
                        <p className="text-sm text-gray-500 mt-4">Supported formats: CSV, Excel (.xlsx) • Max size: 50MB</p>
                    </div>
                )}

                {/* File Info & Progress */}
                {file && (
                    <div className="mt-6 bg-white dark:bg-[#16181D] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-primary-blue/10 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6 text-primary-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">{file?.name}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{file && formatFileSize(file.size)}</p>
                                </div>
                            </div>
                            {!isUploading && !showSchema && (
                                <button onClick={removeFile} className="text-red-600 hover:text-red-700">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            )}
                        </div>

                        <div className="mb-4">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600 dark:text-gray-400">{progress < 100 ? 'Uploading & Processing...' : 'Upload Complete'}</span>
                                <span className="text-primary-blue font-semibold">{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                                <div
                                    className="bg-primary-blue h-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Success Actions */}
                        {showSchema && (
                            <div className="animate-fade-in-up">
                                <hr className="my-6 border-gray-100" />
                                <div className="flex flex-col items-center justify-center py-6">
                                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    </div>
                                    <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-2">Upload Successful!</h4>
                                    <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">Your dataset has been processed and is ready for analysis.</p>

                                    <div className="flex space-x-4">
                                        <button onClick={() => navigate('/user/datasets')} className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition font-medium">
                                            View Datasets
                                        </button>
                                        <button onClick={() => navigate('/user/chat')} className="px-6 py-3 bg-primary-blue text-white rounded-lg hover:bg-blue-700 transition font-medium">
                                            Start Chatting →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Upload Tips */}
                {!file && (
                    <div className="mt-8 grid md:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-[#16181D] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-primary-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Instant Processing</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Automatic schema detection and type inference</p>
                        </div>
                        <div className="bg-white dark:bg-[#16181D] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
                            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                            </div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Secure Upload</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Your data is encrypted and stored securely</p>
                        </div>
                        <div className="bg-white dark:bg-[#16181D] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                                <svg className="w-6 h-6 text-accent-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                            </div>
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Version Control</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">All uploads are versioned and trackable</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
