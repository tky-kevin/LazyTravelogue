import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import client from '../api/client';
import { useItinerary } from '../context/ItineraryContext';

// Custom Markdown renderer with styling for AI chat
const MarkdownContent = ({ content }) => {
    return (
        <ReactMarkdown
            components={{
                // Headings
                h1: ({ children }) => <h1 className="text-base font-bold mt-2 mb-1">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold mt-2 mb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mt-1.5 mb-0.5">{children}</h3>,
                // Paragraphs
                p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                // Lists
                ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                li: ({ children }) => <li className="text-[0.85rem]">{children}</li>,
                // Bold & Italic
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                // Code
                code: ({ children }) => (
                    <code className="bg-indigo-50 px-1 py-0.5 rounded text-[0.8rem] text-indigo-700">
                        {children}
                    </code>
                ),
                // Links
                a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                        {children}
                    </a>
                ),
                // Blockquote
                blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-indigo-200 pl-2 my-1 text-gray-600 italic">
                        {children}
                    </blockquote>
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    );
};

const ItineraryPreview = ({ plan, onImport }) => {
    return (
        <div className="mt-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <h4 className="font-bold text-indigo-900 text-sm mb-1">{plan.title}</h4>
            <p className="text-xs text-indigo-700 mb-2">已為您規劃了 {plan.days.length} 天的行程，包含景點、美食等建議。</p>
            <div className="max-h-32 overflow-y-auto mb-3 space-y-1 pr-1">
                {plan.days.map((day, dIdx) => (
                    <div key={dIdx} className="text-[0.7rem] bg-white/50 p-1.5 rounded flex flex-col gap-0.5">
                        <span className="font-bold text-indigo-600">{day.date}</span>
                        <div className="flex flex-wrap gap-1">
                            {day.activities.slice(0, 3).map((act, aIdx) => (
                                <span key={aIdx} className="bg-white px-1.5 rounded border border-indigo-50 text-gray-600">
                                    {act.title}
                                </span>
                            ))}
                            {day.activities.length > 3 && <span className="text-gray-400">...</span>}
                        </div>
                    </div>
                ))}
            </div>
            <button
                onClick={onImport}
                className="w-full py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
                匯入此行程
            </button>
        </div>
    );
};

export default function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: '👋 我是你的旅遊小精靈！我可以幫你找景點、美食，也可以直接幫你規劃行程喔！你想去哪裡呢？' }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    // Get current itinerary context for smarter answers
    const { currentItinerary, replaceItinerary } = useItinerary();

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;

        const userMsg = inputMessage.trim();

        // Add user message to local state first
        const newUserMessage = { role: 'user', content: userMsg };
        setMessages(prev => [...prev, newUserMessage]);
        setInputMessage('');
        setIsLoading(true);

        try {
            // Prepare itinerary context
            const contextData = currentItinerary ? {
                title: currentItinerary.title,
                startDate: currentItinerary.start_date,
                days: currentItinerary.days?.length || 0
            } : null;

            // Build conversation history (exclude the initial greeting and current message)
            // Only include actual user/assistant exchanges
            const historyForApi = messages
                .slice(1) // Skip initial system greeting
                .filter(msg => msg.role === 'user' || msg.role === 'assistant')
                .map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));

            const res = await client.post('/api/assistant', {
                message: userMsg,
                history: historyForApi,
                context: contextData
            });

            const reply = res.data.reply;
            const sources = res.data.sources || [];
            const plan = res.data.plan || null;
            const suggestions = res.data.suggestions || [];

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: reply,
                sources: sources,
                plan: plan,
                suggestions: suggestions
            }]);
        } catch (error) {
            console.error("AI Chat Error", error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "抱歉，我現在連線有點問題，請稍後再試。 🤖"
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGeneratePlan = async (destination) => {
        setIsLoading(true);
        const userMsg = `幫我規劃去 ${destination} 的行程`;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

        try {
            const res = await client.post('/api/assistant/generate-plan', {
                destination: destination,
                days: 3
            });

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `好的！我為您規劃了 ${destination} 的行程。您可以點擊下方按鈕預覽並匯入我的建議。`,
                plan: res.data
            }]);
        } catch (error) {
            console.error("Plan Generation Error", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "生成行程時發生錯誤，請稍後再試。" }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle dynamic suggestion button clicks
    const handleSuggestionClick = async (suggestion) => {
        if (suggestion.action === 'generate_plan' && suggestion.destination) {
            // Trigger plan generation
            handleGeneratePlan(suggestion.destination);
        } else if (suggestion.action === 'ask' && suggestion.message) {
            // Set the message and send
            setInputMessage(suggestion.message);
            // Auto-send after a short delay
            setTimeout(() => {
                const userMsg = suggestion.message;
                setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
                setInputMessage('');
                // Trigger API call
                sendMessageToApi(userMsg);
            }, 100);
        } else if (suggestion.action === 'modify_days' || suggestion.action === 'regenerate') {
            // Handle modification requests
            const modifyMsg = suggestion.action === 'modify_days'
                ? `請改成 ${suggestion.days} 天的行程`
                : `請以「${suggestion.preferences}」風格重新規劃`;
            setInputMessage(modifyMsg);
            setTimeout(() => {
                setMessages(prev => [...prev, { role: 'user', content: modifyMsg }]);
                setInputMessage('');
                sendMessageToApi(modifyMsg);
            }, 100);
        }
    };

    // Separated API call logic for reuse
    const sendMessageToApi = async (userMsg) => {
        setIsLoading(true);
        try {
            const contextData = currentItinerary ? {
                title: currentItinerary.title,
                startDate: currentItinerary.start_date,
                days: currentItinerary.days?.length || 0
            } : null;

            const historyForApi = messages
                .slice(1)
                .filter(msg => msg.role === 'user' || msg.role === 'assistant')
                .map(msg => ({ role: msg.role, content: msg.content }));

            const res = await client.post('/api/assistant', {
                message: userMsg,
                history: historyForApi,
                context: contextData
            });

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: res.data.reply,
                sources: res.data.sources || [],
                plan: res.data.plan || null,
                suggestions: res.data.suggestions || []
            }]);
        } catch (error) {
            console.error("AI Chat Error", error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "抱歉，我現在連線有點問題，請稍後再試。 🤖"
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <>
            <div className="fixed bottom-24 right-5 md:bottom-8 md:right-8 z-40">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-14 h-14 md:w-16 md:h-16 rounded-full text-white flex items-center justify-center shadow-float border-none cursor-pointer relative bg-gradient-to-br from-indigo-400 to-purple-400"
                >
                    {isOpen ? <X size={28} /> : <Sparkles size={28} />}
                </motion.button>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        style={{
                            position: 'fixed',
                            bottom: '100px',
                            right: '30px',
                            width: '350px',
                            height: '500px',
                            backgroundColor: '#fff',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-float)',
                            border: '1px solid var(--pk-border)',
                            zIndex: 100,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '1rem',
                            background: 'linear-gradient(to right, #818cf8, #c084fc)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}>
                            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '50%' }}>
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>旅遊小精靈</h3>
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div
                            ref={scrollRef}
                            style={{
                                flex: 1,
                                padding: '1rem',
                                backgroundColor: '#f8fafc',
                                overflowY: 'auto',
                                scrollBehavior: 'smooth'
                            }}
                        >
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        marginBottom: '1rem'
                                    }}
                                >
                                    <div style={{
                                        backgroundColor: msg.role === 'user' ? '#818cf8' : '#fff',
                                        color: msg.role === 'user' ? '#fff' : 'var(--pk-text-main)',
                                        padding: '10px 14px',
                                        borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                        boxShadow: 'var(--shadow-sm)',
                                        maxWidth: '85%',
                                        fontSize: '0.9rem',
                                        lineHeight: '1.4'
                                    }}>
                                        {msg.role === 'assistant' ? (
                                            <MarkdownContent content={msg.content} />
                                        ) : (
                                            msg.content
                                        )}
                                        {msg.sources && msg.sources.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-indigo-50 text-[0.65rem] text-gray-500">
                                                <p className="font-semibold mb-1">參考來源：</p>
                                                <ul className="list-disc pl-3 space-y-0.5">
                                                    {msg.sources.map((src, i) => (
                                                        <li key={i}>
                                                            <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                                                                {src.title}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {msg.plan && (
                                            <ItineraryPreview
                                                plan={msg.plan}
                                                onImport={() => replaceItinerary(msg.plan)}
                                            />
                                        )}
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', padding: '0 4px' }}>
                                        {msg.role === 'user' ? '你' : 'AI'}
                                    </span>

                                    {/* Dynamic Suggestions - Show only on the latest AI message */}
                                    {msg.role === 'assistant' && idx === messages.length - 1 && msg.suggestions && msg.suggestions.length > 0 && !isLoading && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {msg.suggestions.map((suggestion, sIdx) => (
                                                <button
                                                    key={sIdx}
                                                    onClick={() => handleSuggestionClick(suggestion)}
                                                    className="px-3 py-1.5 bg-white border border-indigo-100 text-indigo-500 rounded-full text-xs hover:bg-indigo-50 transition-colors shadow-sm font-medium"
                                                >
                                                    {suggestion.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Initial Quick Actions - Show only on first load */}
                            {messages.length === 1 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {['台北', '台南', '高雄'].map(city => (
                                        <button
                                            key={city}
                                            onClick={() => handleGeneratePlan(city)}
                                            className="px-3 py-1.5 bg-white border border-indigo-100 text-indigo-500 rounded-full text-xs hover:bg-indigo-50 transition-colors shadow-sm font-bold"
                                        >
                                            ✨ 規劃 {city}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {isLoading && (
                                <div style={{ alignSelf: 'flex-start', backgroundColor: '#fff', padding: '10px 14px', borderRadius: '12px 12px 12px 0', boxShadow: 'var(--shadow-sm)' }}>
                                    <div className="flex gap-1">
                                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-indigo-400 rounded-full" />
                                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-indigo-400 rounded-full" />
                                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-indigo-400 rounded-full" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div style={{
                            padding: '1rem',
                            borderTop: '1px solid var(--pk-border)',
                            display: 'flex',
                            gap: '0.5rem',
                            backgroundColor: '#fff'
                        }}>
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="輸入訊息..."
                                disabled={isLoading}
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    borderRadius: '20px',
                                    border: '1px solid var(--pk-border)',
                                    outline: 'none',
                                    fontSize: '0.9rem',
                                    backgroundColor: isLoading ? '#f1f5f9' : '#fff'
                                }}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={isLoading || !inputMessage.trim()}
                                style={{
                                    background: inputMessage.trim() ? '#818cf8' : '#cbd5e1',
                                    color: '#fff',
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.2s',
                                    cursor: inputMessage.trim() ? 'pointer' : 'default',
                                    border: 'none'
                                }}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
