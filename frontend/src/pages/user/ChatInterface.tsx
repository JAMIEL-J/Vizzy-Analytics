import { useState, useRef, useEffect } from 'react';
import { chatService, type ChatMessage, type ChatSession } from '../../lib/api/chat';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { datasetService, type Dataset } from '../../lib/api/dataset';
import ChartRenderer from '../../components/chat/ChartRenderer';
import { PlusIcon, ChatBubbleLeftIcon, Bars3Icon, XMarkIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

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

    return (
        <div className="flex h-full bg-bg-main text-themed-main font-display antialiased relative selection:bg-primary selection:text-black">
            <div className="grain-overlay z-0"></div>
            {/* Sidebar */}
            <div className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-bg-main/80 backdrop-blur-md border-r border-border-main transition-all duration-300 flex flex-col flex-shrink-0 overflow-hidden relative z-10`}>
                <div className="p-4 border-b border-border-main flex items-center justify-between font-mono">
                    <h2 className="text-xs uppercase tracking-widest text-themed-muted">Chat History</h2>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-themed-muted hover:text-themed-main transition-colors">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-3">
                    <button
                        onClick={handleNewChat}
                        className="w-full flex items-center justify-center gap-2 obsidian-card py-2.5 rounded-sm hover:border-primary/50 transition-colors font-mono text-xs uppercase tracking-widest text-themed-main group"
                    >
                        <PlusIcon className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                        <span>New Chat</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
                    {sessions.map(session => (
                        <div
                            key={session.id}
                            className={`group w-full flex items-center justify-between px-3 py-3 rounded-sm text-sm transition cursor-pointer font-mono ${currentSessionId === session.id
                                ? 'bg-primary/10 border-l-2 border-primary text-primary'
                                : 'text-themed-muted hover:bg-bg-hover hover:text-themed-main'
                                }`}
                            onClick={() => loadSession(session.id)}
                        >
                            <div className="flex items-start space-x-3 overflow-hidden">
                                <ChatBubbleLeftIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${currentSessionId === session.id ? 'text-primary' : ''}`} />
                                <div className="min-w-0">
                                    <p className="font-medium truncate">{session.title || 'Untitled Chat'}</p>
                                    <p className="text-xs text-themed-muted truncate mt-0.5">
                                        {session.message_count} messages
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={(e) => handleDeleteSession(e, session.id)}
                                className={`p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 hover:text-red-600 dark:hover:text-red-400 transition opacity-0 group-hover:opacity-100 ${currentSessionId === session.id ? 'opacity-100' : ''
                                    }`}
                                title="Delete Session"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {sessions.length === 0 && (
                        <div className="text-center py-8 text-themed-muted text-sm">
                            No recent chats
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
                {/* Header */}
                <header className="bg-bg-main/80 backdrop-blur-md border-b border-border-main px-6 py-4 flex-shrink-0 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="text-themed-muted hover:text-primary transition-colors focus:outline-none"
                        >
                            <Bars3Icon className="w-6 h-6" />
                        </button>
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-xl">diamond</span>
                            <h1 className="text-xl font-light tracking-widest uppercase text-themed-main">Chat Analytics</h1>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3 font-mono">
                        <span className="text-xs uppercase tracking-widest text-themed-muted hidden md:inline">Dataset:</span>
                        <select
                            value={selectedDatasetId}
                            onChange={(e) => setSelectedDatasetId(e.target.value)}
                            className="px-3 py-1.5 bg-bg-card border border-border-main rounded-sm text-xs text-themed-main focus:border-primary outline-none min-w-[180px] transition-colors appearance-none cursor-pointer"
                        >
                            <option value="">Select a dataset...</option>
                            {datasets.map(ds => (
                                <option key={ds.id} value={ds.id}>{ds.name}</option>
                            ))}
                        </select>
                    </div>
                </header>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.length === 0 ? (
                        <div className="flex justify-center mt-10 w-full z-10">
                            <div className="text-center max-w-xl w-full">
                                <div className="w-16 h-16 bg-primary rounded-sm flex items-center justify-center mx-auto mb-4 font-mono text-2xl text-black border-b-4 border-[#b5461c]">
                                    VX
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-themed-main mb-2">Start asking questions!</h3>
                                <p className="text-gray-600 dark:text-themed-muted mb-6">I'm your AI analytics assistant. Ask me anything about your data.</p>

                                {selectedDatasetId && (
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <button onClick={() => handleSendMessage('What is the total sales?')} className="p-4 glass-panel hover:bg-bg-hover transition text-left group">
                                            <span className="text-themed-main group-hover:text-primary font-mono text-xs uppercase tracking-widest transition-colors"><span className="text-primary mr-2">/</span> What is the total sales?</span>
                                        </button>
                                        <button onClick={() => handleSendMessage('Show me revenue by region')} className="p-4 glass-panel hover:bg-bg-hover transition text-left group">
                                            <span className="text-themed-main group-hover:text-primary font-mono text-xs uppercase tracking-widest transition-colors"><span className="text-primary mr-2">/</span> Show me revenue by region</span>
                                        </button>
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
                                            <div className="w-10 h-10 rounded-sm bg-primary border-b-2 border-[#b5461c] flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold text-black font-display font-light shadow-[0_0_15px_rgba(255,105,51,0.3)]">
                                                VX
                                            </div>
                                        )}
                                        <div className={`px-5 py-4 ${msg.role === 'user' ? 'bg-primary text-black rounded-sm border-b-2 border-[#b5461c] shadow-[0_0_15px_rgba(255,105,51,0.2)]' : 'glass-panel text-gray-200'} ${['analysis', 'visualization', 'dashboard'].includes(msg.intent_type || '') && msg.output_data?.type !== 'kpi' ? 'w-full' : ''} ${msg.output_data?.type === 'kpi' ? 'w-auto' : ''}`}>
                                            <div className="text-sm leading-relaxed">
                                                {['analysis', 'visualization', 'dashboard', 'text_query', 'clarification'].includes(msg.intent_type || '') ? (
                                                    <div className="space-y-4 w-full">
                                                        <div className="markdown-content text-themed-main dark:text-gray-200">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm]}
                                                                components={{
                                                                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                                    h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-gray-900 dark:text-themed-main mt-4 mb-2" {...props} />,
                                                                    h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-gray-900 dark:text-themed-main mt-3 mb-2" {...props} />,
                                                                    ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                                                                    li: ({ node, ...props }) => <li className="" {...props} />,
                                                                    strong: ({ node, ...props }) => <strong className="font-bold text-gray-900 dark:text-themed-main" {...props} />,
                                                                    a: ({ node, ...props }) => <a className="text-primary-blue dark:text-blue-400 hover:underline" {...props} />,
                                                                    code: ({ node, ...props }) => <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono text-red-500 dark:text-red-400" {...props} />,
                                                                }}
                                                            >
                                                                {msg.content}
                                                            </ReactMarkdown>
                                                        </div>

                                                        {/* ── Ambiguity Clarification Cards ── */}
                                                        {msg.output_data?.type === 'clarification' && msg.output_data?.ambiguity && (
                                                            <div className="mt-4">
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <span className="text-sm font-bold text-gray-600 dark:text-themed-main">
                                                                        🔀 {msg.output_data.ambiguity.question}
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                    {msg.output_data.ambiguity.candidates.map((candidate: any, idx: number) => {
                                                                        const originalQuery = msg.output_data.ambiguity.original_query || '';
                                                                        const term = msg.output_data.ambiguity.term || '';
                                                                        const newQuery = originalQuery.replace(
                                                                            new RegExp(term, 'i'),
                                                                            candidate.column
                                                                        );
                                                                        const confidence = Math.round(candidate.score * 100);
                                                                        return (
                                                                            <button
                                                                                key={idx}
                                                                                onClick={() => handleSendMessage(newQuery)}
                                                                                className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#16181D] border-2 border-gray-200 dark:border-border-main rounded-xl hover:border-primary-blue dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200 group text-left"
                                                                            >
                                                                                <div>
                                                                                    <span className="font-mono text-sm font-bold text-themed-main dark:text-gray-200 group-hover:text-primary-blue dark:group-hover:text-blue-400 transition-colors">
                                                                                        {candidate.column}
                                                                                    </span>
                                                                                </div>
                                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${confidence >= 85 ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                                                                                    : confidence >= 70 ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
                                                                                        : 'bg-gray-100 dark:bg-gray-800 text-themed-muted dark:text-themed-muted'
                                                                                    }`}>
                                                                                    {confidence}% match
                                                                                </span>
                                                                            </button>
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
                                                                <div className={`mt-6 w-full vizzy-chart-container obsidian-card border border-border-main p-4 shadow-sm pb-3`}>
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
                                                                                    <div className="flex glass-panel p-0.5 rounded-sm shadow-inner group transition-colors">
                                                                                        <button
                                                                                            onClick={() => setChartModes(prev => ({ ...prev, [msg.id]: 'chart' }))}
                                                                                            className={`px-4 py-1.5 text-[10px] font-mono tracking-widest uppercase transition-all ${!isTableMode ? 'bg-primary text-black font-bold shadow-sm' : 'text-themed-muted hover:text-themed-main'}`}
                                                                                        >
                                                                                            Visual
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => setChartModes(prev => ({ ...prev, [msg.id]: 'table' }))}
                                                                                            className={`px-4 py-1.5 text-[10px] font-mono tracking-widest uppercase transition-all ${isTableMode ? 'bg-primary text-black font-bold shadow-sm' : 'text-themed-muted hover:text-themed-main'}`}
                                                                                        >
                                                                                            Data
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <div className="flex items-center space-x-3">
                                                                                <button
                                                                                    onClick={() => handleDownloadCSV(targetData, targetData.title || 'data')}
                                                                                    className="flex items-center space-x-1.5 text-[10px] uppercase tracking-wider font-bold text-themed-muted hover:text-green-600 transition-colors p-1"
                                                                                    title="Download CSV"
                                                                                >
                                                                                    <ArrowDownTrayIcon className="w-4 h-4" />
                                                                                    <span>CSV</span>
                                                                                </button>

                                                                                {targetData.type !== 'kpi' && msg.output_data.response_type !== 'text' && (
                                                                                    <button
                                                                                        onClick={() => handleDownloadImage(msg.id, targetData.title || 'chart')}
                                                                                        className="flex items-center space-x-1.5 text-[10px] uppercase tracking-wider font-bold text-themed-muted hover:text-blue-600 transition-colors p-1"
                                                                                        title="Download SVG"
                                                                                    >
                                                                                        <ArrowDownTrayIcon className="w-4 h-4" />
                                                                                        <span>SVG</span>
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {/* ── SQL Panel (always visible) ── */}
                                                                        {sqlQuery && (
                                                                            <div className="mt-3">
                                                                                <div className="flex items-center justify-between mb-1.5">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-[10px] font-bold font-mono tracking-widest uppercase text-themed-muted flex items-center gap-1">
                                                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                                                                                            Generated SQL
                                                                                        </span>
                                                                                        {msg.output_data?.detected_intent && (
                                                                                            <span className="text-[10px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded-sm bg-primary/20 text-primary">
                                                                                                {msg.output_data.detected_intent}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <button
                                                                                        onClick={() => {
                                                                                            navigator.clipboard.writeText(sqlQuery);
                                                                                            setCopiedSqlMsgId(msg.id);
                                                                                            setTimeout(() => setCopiedSqlMsgId(null), 2000);
                                                                                        }}
                                                                                        className="text-[10px] font-mono font-bold tracking-widest uppercase text-themed-muted hover:text-primary transition-colors flex items-center gap-1"
                                                                                    >
                                                                                        {copiedSqlMsgId === msg.id ? (
                                                                                            <><svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg> Copied!</>
                                                                                        ) : (
                                                                                            <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg> Copy</>
                                                                                        )}
                                                                                    </button>
                                                                                </div>
                                                                                <pre className="p-4 bg-bg-main/50 border border-border-main rounded-sm text-xs font-mono text-primary overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                                                                                    <code>{sqlQuery}</code>
                                                                                </pre>

                                                                                {/* Timing Strip */}
                                                                                {msg.output_data?.timing && (
                                                                                    <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-themed-muted dark:text-themed-muted flex-wrap">
                                                                                        {(() => {
                                                                                            const t = msg.output_data.timing;
                                                                                            const colorFor = (ms: number) => ms > 3000 ? 'text-red-400' : ms > 1000 ? 'text-yellow-400' : 'text-green-400';
                                                                                            return (
                                                                                                <>
                                                                                                    <span className={colorFor(t.llm_ms)}>🧠 LLM: {(t.llm_ms / 1000).toFixed(2)}s</span>
                                                                                                    <span className="text-gray-600">→</span>
                                                                                                    <span className={colorFor(t.validation_ms)}>✅ Validation: {t.validation_ms}ms</span>
                                                                                                    <span className="text-gray-600">→</span>
                                                                                                    <span className={colorFor(t.execution_ms)}>⚡ DB: {t.execution_ms}ms</span>
                                                                                                    <span className="text-gray-600">→</span>
                                                                                                    <span className="font-bold text-themed-main dark:text-themed-muted">Total: {(t.total_ms / 1000).toFixed(2)}s</span>
                                                                                                    {t.retries > 0 && <span className="text-yellow-500 ml-1">(⟳ {t.retries} retries)</span>}
                                                                                                </>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* NL2SQL Diagnostics Card */}
                                                                        {msg.output_data?.nl2sql_diagnostics && (
                                                                            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/40 rounded-lg text-xs">
                                                                                <div className="flex items-center gap-2 mb-2">
                                                                                    <span className="text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider text-[10px]">⚠ Query Diagnostic</span>
                                                                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-mono text-[10px]">
                                                                                        {msg.output_data.nl2sql_diagnostics.error_type}
                                                                                    </span>
                                                                                </div>
                                                                                {msg.output_data.nl2sql_diagnostics.suggestion && (
                                                                                    <p className="text-amber-700 dark:text-amber-300 mb-2">{msg.output_data.nl2sql_diagnostics.suggestion}</p>
                                                                                )}
                                                                                {msg.output_data.nl2sql_diagnostics.attempted_sql && (
                                                                                    <details className="mt-1">
                                                                                        <summary className="text-[10px] text-amber-600 dark:text-amber-400 cursor-pointer font-medium">View failed SQL</summary>
                                                                                        <pre className="mt-1 p-2 bg-gray-900 rounded text-[10px] font-mono text-red-300 overflow-x-auto whitespace-pre-wrap">{msg.output_data.nl2sql_diagnostics.attempted_sql}</pre>
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
                                                                    <button
                                                                        key={idx}
                                                                        onClick={() => handleSendMessage(suggestion)}
                                                                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-full text-xs font-medium text-primary-blue dark:text-blue-400 hover:bg-primary-blue hover:text-themed-main dark:hover:bg-blue-600 dark:hover:text-themed-main transition-all duration-300 transform hover:scale-105"
                                                                    >
                                                                        {suggestion}
                                                                    </button>
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
                                            <div className="w-10 h-10 rounded-sm bg-bg-card border border-white/20 flex items-center justify-center text-themed-main font-mono text-xs flex-shrink-0 shadow-xl">
                                                U
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="max-w-xl flex items-start space-x-3">
                                        <div className="w-10 h-10 rounded-sm bg-primary border-b-2 border-[#b5461c] flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold text-black font-display font-light shadow-[0_0_15px_rgba(255,105,51,0.3)]">
                                            VX
                                        </div>
                                        <div className="glass-panel px-5 py-4 transition-colors duration-300">
                                            <div className="flex space-x-1">
                                                <div className="w-2 h-2 bg-primary animate-pulse"></div>
                                                <div className="w-2 h-2 bg-primary animate-pulse delay-75"></div>
                                                <div className="w-2 h-2 bg-primary animate-pulse delay-150"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="bg-bg-main/80 backdrop-blur-md border-t border-border-main p-6 flex-shrink-0 transition-colors duration-500 z-10 w-full relative">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-end space-x-4">
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
                                    className="w-full px-4 py-4 obsidian-card font-mono text-sm tracking-widest uppercase text-themed-main placeholder-gray-600 focus:border-primary/50 resize-none outline-none disabled:bg-gray-900 disabled:cursor-not-allowed transition-colors"
                                ></textarea>
                            </div>
                            <button
                                onClick={() => handleSendMessage(inputValue)}
                                disabled={!inputValue.trim() || isTyping || !selectedDatasetId}
                                className="px-6 py-4 obsidian-card font-mono text-xs uppercase tracking-widest text-primary hover:bg-primary hover:text-black transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed h-[54px]"
                            >
                                <span>Send</span>
                            </button>
                        </div>
                        {!selectedDatasetId && <p className="text-xs text-red-500 mt-2">Please select a dataset to start chatting</p>}
                        <p className="text-xs text-themed-muted mt-2">Press Enter to send • Shift+Enter for new line</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
