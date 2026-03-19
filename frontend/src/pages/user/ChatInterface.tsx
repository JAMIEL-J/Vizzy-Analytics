import { useState, useRef, useEffect } from 'react';
import { chatService, type ChatMessage, type ChatSession } from '../../lib/api/chat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { datasetService, type Dataset } from '../../lib/api/dataset';
import ChartRenderer from '../../components/chat/ChartRenderer';
import { ShiningText } from '../../components/ui/shining-text';
import { Button } from '@/components/ui/button';


const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildClarifiedQuery = (originalQuery: string, term: string, selectedColumn: string) => {
    const source = (originalQuery || '').trim();
    if (!source) {
        return `Use column ${selectedColumn}`;
    }

    if (!term) {
        return `${source}. Use column ${selectedColumn}.`;
    }

    const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i');
    if (pattern.test(source)) {
        return source.replace(pattern, selectedColumn);
    }

    return `${source}. Use column ${selectedColumn}.`;
};

export default function ChatInterface() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [chartModes, setChartModes] = useState<Record<string, 'chart' | 'table'>>({});
    const [copiedSqlMsgId, setCopiedSqlMsgId] = useState<string | null>(null);

    // Session History State
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);


    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Load datasets on mount
    // Load available datasets
    useEffect(() => {
        loadDatasets();
    }, []);

    // Load session history on mount
    useEffect(() => {
        loadSessions();
    }, []);

    const loadDatasets = async () => {
        try {
            const data = await datasetService.listDatasets();
            setDatasets(data);
            if (data.length > 0 && !selectedDatasetId) {
                setSelectedDatasetId(data[0].id);
            }
        } catch (error) {
            console.error('Failed to load datasets:', error);
        }
    };

    const loadSessions = async () => {
        try {
            const data = await chatService.listSessions();
            setSessions(data);
        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
    };

    const loadSession = async (sessionId: string) => {
        try {
            const session = await chatService.getSession(sessionId);
            setCurrentSessionId(session.id);

            // If session has a dataset, select it
            if (session.dataset_id) {
                setSelectedDatasetId(session.dataset_id);
            }

            const msgs = await chatService.getMessages(sessionId);
            setMessages(msgs);

            // Mobile: close sidebar on selection
            if (window.innerWidth < 768) {
                setIsSidebarOpen(false);
            }
        } catch (error) {
            console.error('Failed to load session:', error);
        }
    };

    const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this chat session?')) return;

        try {
            await chatService.deleteSession(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));

            if (currentSessionId === sessionId) {
                setCurrentSessionId(null);
                setMessages([]);
            }
        } catch (error) {
            console.error('Failed to delete session:', error);
        }
    };

    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([]);
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    };

    const handleDownloadCSV = (data: any, title: string) => {
        const rows = data.data?.rows || data.rows || data.data || [];
        if (!Array.isArray(rows) || rows.length === 0) return;

        const headers = Object.keys(rows[0]).join(',');
        const csvRows = rows.map((row: any) =>
            Object.values(row).map(val => `"${val}"`).join(',')
        );
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...csvRows].join('\n');
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `${title || 'vizzy-data'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadImage = (messageId: string, title: string) => {
        const container = document.getElementById(`msg-${messageId}`);
        if (!container) return;

        const chartWrapper = container.querySelector('.vizzy-chart-container');
        if (!chartWrapper) return;

        const svg = chartWrapper.querySelector('svg');
        if (!svg) return;

        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svg);
        if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${title || 'vizzy-chart'}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    const handleSendMessage = async (text: string) => {
        if (!text.trim()) return;

        let sessionId = currentSessionId;

        if (!sessionId) {
            try {
                const title = text.length > 30 ? text.substring(0, 30) + '...' : text;
                const newSession = await chatService.createSession(selectedDatasetId || undefined, undefined, title);
                sessionId = newSession.id;
                setCurrentSessionId(sessionId);
                loadSessions();
            } catch (error) {
                console.error('Failed to create new session:', error);
                return;
            }
        }

        const tempId = Date.now().toString();
        const userMsg: ChatMessage = {
            id: tempId,
            role: 'user',
            content: text,
            sequence: messages.length + 1
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsTyping(true);

        try {
            const response = await chatService.sendMessage(sessionId, text);
            setMessages(prev => {
                const filtered = prev.filter(m => m.id !== tempId);
                return [...filtered, response.user_message, response.assistant_message];
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'assistant',
                content: 'Sorry, I encountered an error responding to your request.',
                sequence: prev.length + 1,
                intent_type: 'error'
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const renderHistoryList = () => (
        <>
            <div className="p-4 border-b border-border-main/30 flex items-center justify-between font-mono">
                <h2 className="text-xs uppercase tracking-widest text-themed-muted">History</h2>
                <Button type="button" onClick={() => setIsSidebarOpen(false)} variant="ghost" size="icon" className="text-themed-muted hover:text-themed-main transition-colors">
                    <span className="material-symbols-outlined text-[16px] leading-none">close</span>
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
                <p className="text-[10px] font-semibold text-themed-muted uppercase tracking-widest px-2">Today</p>
                {sessions.slice(0, 5).map(session => (
                    <div
                        key={session.id}
                        className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition cursor-pointer ${currentSessionId === session.id
                            ? 'bg-primary/10 border border-primary/30 text-primary'
                            : 'text-themed-muted hover:bg-bg-hover hover:text-themed-main border border-transparent'
                            }`}
                        onClick={() => loadSession(session.id)}
                    >
                        <div className="flex items-start space-x-3 overflow-hidden">
                            <span className={`material-symbols-outlined text-[16px] leading-none flex-shrink-0 mt-0.5 ${currentSessionId === session.id ? 'text-primary' : ''}`}>chat</span>
                            <div className="min-w-0">
                                <p className="font-medium truncate">{session.title || 'Untitled Chat'}</p>
                                <p className="text-[10px] text-themed-muted truncate mt-0.5 uppercase tracking-wide">
                                    {session.message_count} messages
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            onClick={(e) => handleDeleteSession(e, session.id)}
                            className={`p-1.5 rounded-sm hover:bg-red-500/10 text-red-500 hover:text-red-500 transition opacity-0 group-hover:opacity-100 ${currentSessionId === session.id ? 'opacity-100' : ''
                                }`}
                            title="Delete Session"
                            variant="ghost"
                            size="icon"
                        >
                            <span className="material-symbols-outlined text-[16px] leading-none">delete</span>
                        </Button>
                    </div>
                ))}

                {sessions.length > 5 && (
                    <>
                        <p className="text-[10px] font-semibold text-themed-muted uppercase tracking-widest px-2 pt-3">Yesterday</p>
                        {sessions.slice(5, 12).map(session => (
                            <div
                                key={session.id}
                                className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition cursor-pointer ${currentSessionId === session.id
                                    ? 'bg-primary/10 border border-primary/30 text-primary'
                                    : 'text-themed-muted hover:bg-bg-hover hover:text-themed-main border border-transparent'
                                    }`}
                                onClick={() => loadSession(session.id)}
                            >
                                <div className="flex items-start space-x-3 overflow-hidden">
                                    <span className={`material-symbols-outlined text-[16px] leading-none flex-shrink-0 mt-0.5 ${currentSessionId === session.id ? 'text-primary' : ''}`}>chat</span>
                                    <div className="min-w-0">
                                        <p className="font-medium truncate">{session.title || 'Untitled Chat'}</p>
                                        <p className="text-[10px] text-themed-muted truncate mt-0.5 uppercase tracking-wide">{session.message_count} messages</p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    onClick={(e) => handleDeleteSession(e, session.id)}
                                    className={`p-1.5 rounded-sm hover:bg-red-500/10 hover:text-red-500 transition opacity-0 group-hover:opacity-100 ${currentSessionId === session.id ? 'opacity-100' : ''}`}
                                    title="Delete Session"
                                    variant="ghost"
                                    size="icon"
                                >
                                    <span className="material-symbols-outlined text-[16px] leading-none">delete</span>
                                </Button>
                            </div>
                        ))}
                    </>
                )}

                {sessions.length === 0 && (
                    <div className="text-center py-8 text-themed-muted text-sm">
                        No recent chats
                    </div>
                )}
            </div>

            <div className="p-4 bg-bg-main/40 border-t border-border-main/30">
                <Button
                    type="button"
                    onClick={handleNewChat}
                    className="w-full flex items-center justify-center gap-2 bg-bg-card border border-border-main/40 py-2.5 rounded-xl hover:border-primary/50 transition-colors font-mono text-xs text-themed-main"
                    variant="ghost"
                >
                    <span className="material-symbols-outlined text-[16px] leading-none text-primary">add_circle</span>
                    <span>New Analysis</span>
                </Button>
            </div>
        </>
    );

    return (
        <div className="flex h-full bg-bg-main text-themed-main font-display antialiased relative selection:bg-primary selection:text-white">
            <div className="grain-overlay z-0"></div>
            {/* Desktop Sidebar */}
            <div className={`hidden md:flex ${isSidebarOpen ? 'w-72' : 'w-0'} bg-bg-card border-r border-border-main/30 transition-all duration-300 flex-col flex-shrink-0 overflow-hidden relative z-10`}>
                {renderHistoryList()}
            </div>

            {/* Mobile Sidebar + Backdrop */}
            {isSidebarOpen && (
                <>
                    <div className="md:hidden fixed inset-0 bg-black/50 z-20" onClick={() => setIsSidebarOpen(false)} />
                    <div className="md:hidden fixed inset-y-0 left-0 w-72 bg-bg-card border-r border-border-main/30 z-30 flex flex-col">
                        {renderHistoryList()}
                    </div>
                </>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
                {!isSidebarOpen && (
                    <div className="absolute left-4 top-4 z-20">
                        <Button
                            type="button"
                            onClick={() => setIsSidebarOpen(true)}
                            className="h-9 px-3 bg-bg-card border border-border-main/40 rounded-xl text-themed-muted hover:text-primary hover:border-primary/40 transition-colors"
                            variant="ghost"
                        >
                            <span className="material-symbols-outlined text-[16px] leading-none">menu_open</span>
                            <span className="ml-1 text-[11px] uppercase tracking-wider">History</span>
                        </Button>
                    </div>
                )}

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto w-full">
                    <div className="p-6 md:p-10 space-y-8 max-w-5xl mx-auto w-full">
                        {messages.length === 0 ? (
                        <div className="flex justify-center mt-6 w-full z-10">
                            <div className="text-center max-w-xl w-full">
                                <div className="w-16 h-16 bg-primary rounded-sm flex items-center justify-center mx-auto mb-4 font-mono text-2xl text-white border-b-4 border-[#4f46e5]">
                                    VX
                                </div>
                                <h3 className="text-xl font-bold text-themed-main mb-2">Start asking questions!</h3>
                                <p className="text-themed-muted mb-6">I'm your AI analytics assistant. Ask me anything about your data.</p>

                                <div className="mb-4 flex items-center justify-center gap-2">
                                    <span className="text-[10px] uppercase tracking-widest text-themed-muted">Dataset</span>
                                    <select
                                        value={selectedDatasetId}
                                        onChange={(e) => setSelectedDatasetId(e.target.value)}
                                        className="px-3 py-1.5 bg-bg-card border border-border-main rounded-full text-xs text-themed-main focus:border-primary outline-none min-w-[220px] transition-colors appearance-none cursor-pointer"
                                    >
                                        <option value="">Select a dataset...</option>
                                        {datasets.map(ds => (
                                            <option key={ds.id} value={ds.id}>{ds.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedDatasetId && (
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <Button type="button" onClick={() => handleSendMessage('What is the total sales?')} className="p-4 bg-surface-container-low dark:bg-white/5 border border-transparent dark:border-white/5 rounded-xl hover:bg-surface-container transition text-left group" variant="ghost">
                                            <span className="text-themed-main group-hover:text-primary font-mono text-xs uppercase tracking-widest transition-colors"><span className="text-primary mr-2">/</span> What is the total sales?</span>
                                        </Button>
                                        <Button type="button" onClick={() => handleSendMessage('Show me revenue by region')} className="p-4 bg-surface-container-low dark:bg-white/5 border border-transparent dark:border-white/5 rounded-xl hover:bg-surface-container transition text-left group" variant="ghost">
                                            <span className="text-themed-main group-hover:text-primary font-mono text-xs uppercase tracking-widest transition-colors"><span className="text-primary mr-2">/</span> Show me revenue by region</span>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg) => (
                                <div key={msg.id} id={`msg-${msg.id}`} className={`flex w-full mb-8 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`${['analysis', 'visualization', 'dashboard'].includes(msg.intent_type || '') && msg.output_data?.type !== 'kpi' ? 'max-w-7xl w-full' : 'max-w-xl'} flex items-start space-x-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                        {msg.role === 'assistant' && (
                                            <div className="w-10 h-10 rounded-sm bg-primary border-b-2 border-[#4f46e5] flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold text-white font-display font-light shadow-[0_0_15px_rgba(108,99,255,0.3)]">
                                                VX
                                            </div>
                                        )}
                                        <div className={`px-5 py-4 ${msg.role === 'user' ? 'bg-primary text-white rounded-xl shadow-sm' : 'bg-surface-container-lowest dark:bg-surface-container/80 dark:backdrop-blur-md border border-transparent dark:border-white/5 rounded-xl text-on-surface'} ${['analysis', 'visualization', 'dashboard'].includes(msg.intent_type || '') && msg.output_data?.type !== 'kpi' ? 'w-full' : ''} ${msg.output_data?.type === 'kpi' ? 'w-auto' : ''}`}>
                                            <div className="text-sm leading-relaxed">
                                                {['analysis', 'visualization', 'dashboard', 'text_query', 'clarification'].includes(msg.intent_type || '') ? (
                                                    <div className="space-y-4 w-full">
                                                        <div className="markdown-content text-themed-main">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm]}
                                                                components={{
                                                                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                                    h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-themed-main mt-4 mb-2" {...props} />,
                                                                    h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-themed-main mt-3 mb-2" {...props} />,
                                                                    ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                                                                    li: ({ node, ...props }) => <li className="" {...props} />,
                                                                    strong: ({ node, ...props }) => <strong className="font-bold text-themed-main" {...props} />,
                                                                    a: ({ node, ...props }) => <a className="text-primary hover:underline" {...props} />,
                                                                    code: ({ node, ...props }) => <code className="bg-bg-card px-1 py-0.5 rounded text-sm font-mono text-primary border border-border-main" {...props} />,
                                                                }}
                                                            >
                                                                {msg.content}
                                                            </ReactMarkdown>
                                                        </div>

                                                        {/* ── Ambiguity Clarification Cards ── */}
                                                        {msg.output_data?.type === 'clarification' && msg.output_data?.ambiguity && (
                                                            <div className="mt-4">
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <span className="material-symbols-outlined text-[16px] text-primary leading-none">conversion_path</span>
                                                                    <span className="text-sm font-bold text-themed-main">{msg.output_data.ambiguity.question}</span>
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                    {msg.output_data.ambiguity.candidates.map((candidate: any, idx: number) => {
                                                                        const originalQuery = msg.output_data.ambiguity.original_query || '';
                                                                        const term = msg.output_data.ambiguity.term || '';
                                                                        const newQuery = buildClarifiedQuery(originalQuery, term, candidate.column);
                                                                        const confidence = Math.round(candidate.score * 100);
                                                                        return (
                                                                            <Button
                                                                                type="button"
                                                                                key={idx}
                                                                                onClick={() => handleSendMessage(newQuery)}
                                                                                className="flex items-center justify-between px-4 py-3 bg-bg-card border border-border-main rounded-md hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group text-left"
                                                                                variant="ghost"
                                                                            >
                                                                                <div>
                                                                                    <span className="font-mono text-sm font-bold text-themed-main group-hover:text-primary transition-colors">
                                                                                        {candidate.column}
                                                                                    </span>
                                                                                </div>
                                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm border ${confidence >= 85 ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                                                                    : confidence >= 70 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                                                                        : 'bg-bg-main text-themed-muted border-border-main'
                                                                                    }`}>
                                                                                    {confidence}% match
                                                                                </span>
                                                                            </Button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {msg.output_data && msg.output_data.type !== 'clarification' && (() => {
                                                            const targetData = msg.output_data.type === 'nl2sql' && msg.output_data.chart
                                                                ? { ...msg.output_data.chart, sql: msg.output_data.sql }
                                                                : msg.output_data;

                                                            const isTableMode = chartModes[msg.id] === 'table';
                                                            const sqlQuery = targetData.sql || msg.output_data.sql;

                                                            return (
                                                                <div className={`mt-6 w-full vizzy-chart-container bg-surface-container-lowest dark:bg-surface-container/80 dark:backdrop-blur-md border border-transparent dark:border-white/5 rounded-xl p-4 shadow-sm pb-3`}>
                                                                    <ChartRenderer
                                                                        type={isTableMode ? 'table' : (targetData.type || 'unknown')}
                                                                        data={targetData}
                                                                        title={targetData.title || targetData.chart?.title}
                                                                        currency={targetData.currency}
                                                                        variant="minimal"
                                                                    />

                                                                    {/* Actions Bar */}
                                                                    <div className="mt-4 flex flex-col border-t border-border-main pt-3">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center space-x-4">
                                                                                {targetData.type !== 'kpi' && msg.output_data.response_type !== 'text' && (
                                                                                    <div className="flex bg-surface-container-low dark:bg-white/5 p-0.5 rounded-lg shadow-inner group transition-colors">
                                                                                        <Button
                                                                                            type="button"
                                                                                            onClick={() => setChartModes(prev => ({ ...prev, [msg.id]: 'chart' }))}
                                                                                            className={`px-4 py-1.5 text-[10px] font-mono tracking-widest uppercase transition-all ${!isTableMode ? 'bg-primary text-white font-bold shadow-sm' : 'text-themed-muted hover:text-themed-main'}`}
                                                                                            variant="ghost"
                                                                                        >
                                                                                            Visual
                                                                                        </Button>
                                                                                        <Button
                                                                                            type="button"
                                                                                            onClick={() => setChartModes(prev => ({ ...prev, [msg.id]: 'table' }))}
                                                                                            className={`px-4 py-1.5 text-[10px] font-mono tracking-widest uppercase transition-all ${isTableMode ? 'bg-primary text-white font-bold shadow-sm' : 'text-themed-muted hover:text-themed-main'}`}
                                                                                            variant="ghost"
                                                                                        >
                                                                                            Data
                                                                                        </Button>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <div className="flex items-center space-x-3">
                                                                                <Button
                                                                                    type="button"
                                                                                    onClick={() => handleDownloadCSV(targetData, targetData.title || 'data')}
                                                                                    className="flex items-center space-x-1.5 text-[10px] uppercase tracking-wider font-bold text-themed-muted hover:text-green-600 transition-colors p-1"
                                                                                    title="Download CSV"
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                >
                                                                                    <span className="material-symbols-outlined text-[14px] leading-none">table_view</span>
                                                                                    <span>CSV</span>
                                                                                </Button>

                                                                                {targetData.type !== 'kpi' && msg.output_data.response_type !== 'text' && (
                                                                                    <Button
                                                                                        type="button"
                                                                                        onClick={() => handleDownloadImage(msg.id, targetData.title || 'chart')}
                                                                                        className="flex items-center space-x-1.5 text-[10px] uppercase tracking-wider font-bold text-themed-muted hover:text-blue-600 transition-colors p-1"
                                                                                        title="Download SVG"
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                    >
                                                                                        <span className="material-symbols-outlined text-[14px] leading-none">download</span>
                                                                                        <span>SVG</span>
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* SQL Panel */}
                                                                        {sqlQuery && (
                                                                            <div className="mt-4 rounded-sm border border-border-main bg-bg-main/40">
                                                                                <div className="flex items-center justify-between px-3 py-2 border-b border-border-main/70">
                                                                                    <div className="flex items-center gap-2.5">
                                                                                        <span className="text-[10px] font-semibold font-mono tracking-[0.16em] uppercase text-themed-muted">
                                                                                            Generated SQL
                                                                                        </span>
                                                                                        {msg.output_data?.detected_intent && (
                                                                                            <span className="text-[10px] font-medium font-mono tracking-widest uppercase px-2 py-0.5 rounded-sm bg-primary/15 text-primary border border-primary/30">
                                                                                                {msg.output_data.detected_intent}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <Button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            navigator.clipboard.writeText(sqlQuery);
                                                                                            setCopiedSqlMsgId(msg.id);
                                                                                            setTimeout(() => setCopiedSqlMsgId(null), 2000);
                                                                                        }}
                                                                                        className="text-[10px] font-mono font-semibold tracking-widest uppercase text-themed-muted hover:text-primary transition-colors flex items-center gap-1"
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                    >
                                                                                        {copiedSqlMsgId === msg.id ? (
                                                                                            <><span className="material-symbols-outlined text-[13px] leading-none text-primary">check</span> Copied!</>
                                                                                        ) : (
                                                                                            <><span className="material-symbols-outlined text-[13px] leading-none">content_copy</span> Copy</>
                                                                                        )}
                                                                                    </Button>
                                                                                </div>
                                                                                <pre className="mx-3 my-3 p-3 bg-bg-card border border-border-main/70 rounded-sm text-xs font-mono text-primary overflow-x-auto whitespace-pre-wrap leading-relaxed">
                                                                                    <code>{sqlQuery}</code>
                                                                                </pre>

                                                                                {/* Timing Strip */}
                                                                                {msg.output_data?.timing && (
                                                                                    <div className="px-3 pb-3 pt-0.5 flex items-center gap-2 flex-wrap">
                                                                                        {(() => {
                                                                                            const t = msg.output_data.timing;
                                                                                            const toneFor = (ms: number) => ms > 3000
                                                                                                ? 'text-red-500 bg-red-50 border-red-200'
                                                                                                : ms > 1000
                                                                                                    ? 'text-amber-600 bg-amber-50 border-amber-200'
                                                                                                    : 'text-emerald-600 bg-emerald-50 border-emerald-200';
                                                                                            return (
                                                                                                <>
                                                                                                    <span className={`text-[10px] font-mono font-semibold px-2 py-1 rounded-sm border ${toneFor(t.llm_ms)}`}>
                                                                                                        LLM {(t.llm_ms / 1000).toFixed(2)}s
                                                                                                    </span>
                                                                                                    <span className={`text-[10px] font-mono font-semibold px-2 py-1 rounded-sm border ${toneFor(t.validation_ms)}`}>
                                                                                                        Validation {t.validation_ms}ms
                                                                                                    </span>
                                                                                                    <span className={`text-[10px] font-mono font-semibold px-2 py-1 rounded-sm border ${toneFor(t.execution_ms)}`}>
                                                                                                        DB {t.execution_ms}ms
                                                                                                    </span>
                                                                                                    <span className="text-[10px] font-mono font-semibold px-2 py-1 rounded-sm border border-border-main text-themed-main bg-bg-main/70">
                                                                                                        Total {(t.total_ms / 1000).toFixed(2)}s
                                                                                                    </span>
                                                                                                    {t.retries > 0 && (
                                                                                                        <span className="text-[10px] font-mono font-semibold px-2 py-1 rounded-sm border border-amber-200 text-amber-600 bg-amber-50">
                                                                                                            Retries {t.retries}
                                                                                                        </span>
                                                                                                    )}
                                                                                                </>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* NL2SQL Diagnostics Card */}
                                                                        {msg.output_data?.nl2sql_diagnostics && (
                                                                            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs">
                                                                                <div className="flex items-center gap-2 mb-2">
                                                                                    <span className="material-symbols-outlined text-[14px] text-amber-600 leading-none">warning</span>
                                                                                    <span className="text-amber-600 font-bold uppercase tracking-wider text-[10px]">Query Diagnostic</span>
                                                                                    <span className="px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-700 font-mono text-[10px]">
                                                                                        {msg.output_data.nl2sql_diagnostics.error_type}
                                                                                    </span>
                                                                                </div>
                                                                                {msg.output_data.nl2sql_diagnostics.suggestion && (
                                                                                    <p className="text-amber-700 mb-2">{msg.output_data.nl2sql_diagnostics.suggestion}</p>
                                                                                )}
                                                                                {msg.output_data.nl2sql_diagnostics.attempted_sql && (
                                                                                    <details className="mt-1">
                                                                                        <summary className="text-[10px] text-amber-600 cursor-pointer font-medium">View failed SQL</summary>
                                                                                        <pre className="mt-1 p-2 bg-bg-main rounded-sm text-[10px] font-mono text-red-500 overflow-x-auto whitespace-pre-wrap border border-border-main">{msg.output_data.nl2sql_diagnostics.attempted_sql}</pre>
                                                                                    </details>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Follow-up Suggestions */}
                                                        {msg.output_data?.followup_suggestions?.length > 0 && (
                                                            <div className="mt-6 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                                                {msg.output_data.followup_suggestions.map((suggestion: string, idx: number) => (
                                                                    <Button
                                                                        type="button"
                                                                        key={idx}
                                                                        onClick={() => handleSendMessage(suggestion)}
                                                                        className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-sm text-xs font-medium text-primary hover:bg-primary hover:text-white transition-colors"
                                                                        variant="ghost"
                                                                    >
                                                                        {suggestion}
                                                                    </Button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="markdown-content">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {msg.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {msg.role === 'user' && (
                                            <div className="w-10 h-10 rounded-xl bg-bg-card border border-border-main flex items-center justify-center text-themed-main font-mono text-xs flex-shrink-0 shadow-xl">U</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="max-w-xl flex items-start space-x-3">
                                        <div className="w-10 h-10 rounded-sm bg-primary border-b-2 border-[#4f46e5] flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold text-white font-display font-light shadow-[0_0_15px_rgba(108,99,255,0.3)]">
                                            VX
                                        </div>
                                        <div className="bg-surface-container-lowest dark:bg-surface-container/80 dark:backdrop-blur-md border border-transparent dark:border-white/5 rounded-xl px-5 py-4 transition-colors duration-300">
                                            <ShiningText text="Vizzy is Analyzing..." />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Area */}
                <div className="bg-gradient-to-t from-bg-main via-bg-main/95 to-transparent p-6 flex-shrink-0 transition-colors duration-500 z-10 w-full relative">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-end space-x-3 bg-bg-card border border-border-main rounded-2xl p-2 pl-4">
                            <div className="flex-1">
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(inputValue);
                                        }
                                    }}
                                    rows={1}
                                    placeholder="TYPE YOUR QUERY [ENTER]"
                                    disabled={!selectedDatasetId}
                                    className="w-full py-3 bg-transparent font-body text-sm tracking-wide text-themed-main placeholder:text-themed-muted focus:border-primary/50 resize-none outline-none disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                                ></textarea>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-themed-muted hover:text-primary transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px] leading-none">attach_file</span>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-themed-muted hover:text-primary transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px] leading-none">mic</span>
                            </Button>
                            <Button
                                type="button"
                                onClick={() => handleSendMessage(inputValue)}
                                disabled={!inputValue.trim() || isTyping || !selectedDatasetId}
                                className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center shadow-md hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined text-[18px] leading-none">send</span>
                            </Button>
                        </div>
                        {!selectedDatasetId && <p className="text-xs text-red-500 mt-2">Please select a dataset to start chatting</p>}
                        <p className="text-[10px] text-themed-muted mt-2 text-center">Vizzy can make mistakes. Check important info.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
