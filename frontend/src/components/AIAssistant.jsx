import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../api/client';
import { useItinerary } from '../context/ItineraryContext';

export default function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: '👋 Hi there! I can help you plan your perfect trip. Where would you like to go next?' }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    // Get current itinerary context for smarter answers
    const { currentItinerary } = useItinerary();

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim()) return;

        const userMsg = inputMessage.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInputMessage('');
        setIsLoading(true);

        try {
            // Prepare context
            const contextData = currentItinerary ? {
                title: currentItinerary.title,
                startDate: currentItinerary.start_date,
                days: Object.keys(currentItinerary.days || {}).length
            } : null;

            const res = await client.post('/api/assistant', {
                message: userMsg,
                context: contextData
            });

            const reply = res.data.reply;
            setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        } catch (error) {
            console.error("AI Chat Error", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting to the travel brain right now. Please try again later. 🤖status:503" }]);
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
                    className="w-14 h-14 md:w-16 md:h-16 rounded-[30%] text-white flex items-center justify-center shadow-float border-none cursor-pointer relative bg-gradient-to-br from-indigo-400 to-purple-400"
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
                                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Travel Assistant</h3>
                                <p style={{ fontSize: '0.8rem', opacity: 0.9 }}>Powered by LazyTravel AI</p>
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
                                        {msg.content}
                                    </div>
                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', padding: '0 4px' }}>
                                        {msg.role === 'user' ? 'You' : 'AI'}
                                    </span>
                                </div>
                            ))}

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
                                placeholder="Type a message..."
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
