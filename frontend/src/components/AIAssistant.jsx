import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';
import { useItinerary } from '../context/ItineraryContext';

// Sub-components
import MarkdownContent from './ai/MarkdownContent';
import ItineraryPreview from './ai/ItineraryPreview';
import ChatMessage from './ai/ChatMessage';

export default function AIAssistant({ inline = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: '👋 **嗨！我是你的旅遊小精靈！**\n\n我可以幫你：\n- 🗺️ 尋找景點\n- 🍜 推薦美食\n- ✨ 直接規劃完整行程\n\n你想去哪裡呢？\n\n> *小提醒：地圖和 AI 免費額度有限，若額度用罄，還請包涵喔！\n(*//▽//*)q*' }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    const { currentItinerary, replaceItinerary } = useItinerary();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleNewChat = () => {
        setMessages([{
            role: 'assistant',
            content: '👋 **嗨！我是你的旅遊小精靈！**\n\n我可以幫你：\n- 🗺️ 尋找景點\n- 🍜 推薦美食\n- ✨ 直接規劃完整行程\n\n你想去哪裡呢？\n\n> *小提醒：地圖和 AI 免費額度有限，若額度用罄，還請包涵喔！\n(*//▽//*)q*'
        }]);
        setInputMessage('');
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;

        const userMsg = inputMessage.trim();
        const newUserMessage = { role: 'user', content: userMsg };
        setMessages(prev => [...prev, newUserMessage]);
        setInputMessage('');
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
                .map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));

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

    const handleSuggestionClick = async (suggestion) => {
        if (suggestion.action === 'generate_plan' && suggestion.destination) {
            handleGeneratePlan(suggestion.destination);
        } else if (suggestion.action === 'ask' && suggestion.message) {
            setInputMessage(suggestion.message);
            setTimeout(() => {
                const userMsg = suggestion.message;
                setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
                setInputMessage('');
                sendMessageToApi(userMsg);
            }, 100);
        } else if (suggestion.action === 'modify_days' || suggestion.action === 'regenerate') {
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

    if (inline) {
        return (
            <div style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#fff',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1rem',
                    background: 'var(--pk-primary, #14b8a6)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '50%' }}>
                        <Sparkles size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>旅遊小精靈</h3>
                    </div>
                    <button
                        onClick={handleNewChat}
                        style={{
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none',
                            color: '#fff',
                            padding: '6px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.2s',
                        }}
                        title="新對話"
                    >
                        <RefreshCw size={16} />
                    </button>
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
                        <ChatMessage
                            key={idx}
                            idx={idx}
                            msg={msg}
                            totalMessages={messages.length}
                            isLoading={isLoading}
                            onSuggestionClick={handleSuggestionClick}
                            onImportPlan={replaceItinerary}
                        />
                    ))}

                    {/* Initial Quick Actions - Show only on first load */}
                    {messages.length === 1 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {['台北', '台南', '高雄'].map(city => (
                                <button
                                    key={city}
                                    onClick={() => handleGeneratePlan(city)}
                                    className="px-3 py-1.5 bg-white border border-teal-100 text-primary rounded-full text-xs hover:bg-teal-50 transition-colors shadow-sm font-bold"
                                >
                                    ✨ 規劃 {city}
                                </button>
                            ))}
                        </div>
                    )}

                    {isLoading && (
                        <div style={{ alignSelf: 'flex-start', backgroundColor: '#fff', padding: '10px 14px', borderRadius: '12px 12px 12px 0', boxShadow: 'var(--shadow-sm)' }}>
                            <div className="flex gap-1">
                                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-[#14b8a6] rounded-full" />
                                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-[#14b8a6] rounded-full" />
                                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-[#14b8a6] rounded-full" />
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
                    backgroundColor: '#fff',
                    paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))'
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
                            background: inputMessage.trim() ? '#14b8a6' : '#cbd5e1',
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
            </div>
        );
    }

    return (
        <>
            <div className="fixed bottom-24 right-5 md:bottom-8 md:right-8 z-40 md:block hidden">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-14 h-14 md:w-16 md:h-16 rounded-full text-white flex items-center justify-center shadow-float border-none cursor-pointer relative bg-gradient-to-br from-[#14b8a6] to-[#0d9488]"
                >
                    {isOpen ? <X size={28} /> : <Sparkles size={28} />}
                </motion.button>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="fixed bottom-0 right-0 md:bottom-[100px] md:right-[30px] w-full h-full md:w-[380px] md:h-[600px] bg-white md:rounded-[2rem] shadow-[var(--shadow-float)] z-[100] flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div style={{
                            padding: '1.25rem',
                            background: 'var(--pk-primary, #14b8a6)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}>
                            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px', borderRadius: '50%' }}>
                                <Sparkles size={18} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>旅遊小精靈</h3>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleNewChat}
                                    style={{
                                        background: 'rgba(255,255,255,0.15)',
                                        border: 'none',
                                        color: '#fff',
                                        padding: '6px',
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'background 0.2s',
                                    }}
                                    title="新對話"
                                >
                                    <RefreshCw size={16} />
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    style={{
                                        background: 'rgba(255,255,255,0.15)',
                                        border: 'none',
                                        color: '#fff',
                                        padding: '6px',
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'background 0.2s',
                                    }}
                                    className="md:hidden flex"
                                >
                                    <X size={18} />
                                </button>
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
                                <ChatMessage
                                    key={idx}
                                    idx={idx}
                                    msg={msg}
                                    totalMessages={messages.length}
                                    isLoading={isLoading}
                                    onSuggestionClick={handleSuggestionClick}
                                    onImportPlan={replaceItinerary}
                                />
                            ))}

                            {/* Initial Quick Actions - Show only on first load */}
                            {messages.length === 1 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {['台北', '台南', '高雄'].map(city => (
                                        <button
                                            key={city}
                                            onClick={() => handleGeneratePlan(city)}
                                            className="px-3 py-1.5 bg-white border border-teal-100 text-primary rounded-full text-xs hover:bg-teal-50 transition-colors shadow-sm font-bold"
                                        >
                                            ✨ 規劃 {city}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {isLoading && (
                                <div style={{ alignSelf: 'flex-start', backgroundColor: '#fff', padding: '10px 14px', borderRadius: '12px 12px 12px 0', boxShadow: 'var(--shadow-sm)' }}>
                                    <div className="flex gap-1">
                                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-[#14b8a6] rounded-full" />
                                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-[#14b8a6] rounded-full" />
                                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-[#14b8a6] rounded-full" />
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
                                    background: inputMessage.trim() ? '#14b8a6' : '#cbd5e1',
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
