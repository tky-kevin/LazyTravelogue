import { useState } from 'react';
import { Sparkles, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 100 }}>
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '30%', // Squircle
                        background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'var(--shadow-float)',
                        border: 'none',
                        cursor: 'pointer',
                        position: 'relative'
                    }}
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
                                <p style={{ fontSize: '0.8rem', opacity: 0.9 }}>Ask me anything!</p>
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div style={{
                            flex: 1,
                            padding: '1rem',
                            backgroundColor: '#f8fafc',
                            overflowY: 'auto'
                        }}>
                            <div style={{
                                marginBottom: '1rem',
                                alignSelf: 'flex-start',
                                backgroundColor: '#fff',
                                padding: '10px 14px',
                                borderRadius: '12px 12px 12px 0',
                                boxShadow: 'var(--shadow-sm)',
                                maxWidth: '85%',
                                fontSize: '0.9rem',
                                color: 'var(--pk-text-main)'
                            }}>
                                👋 Hi there! I can help you plan your perfect trip. Where would you like to go next?
                            </div>
                        </div>

                        {/* Input Area */}
                        <div style={{
                            padding: '1rem',
                            borderTop: '1px solid var(--pk-border)',
                            display: 'flex',
                            gap: '0.5rem'
                        }}>
                            <input
                                type="text"
                                placeholder="Type a message..."
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    borderRadius: '20px',
                                    border: '1px solid var(--pk-border)',
                                    outline: 'none',
                                    fontSize: '0.9rem'
                                }}
                            />
                            <button style={{
                                background: '#818cf8',
                                color: '#fff',
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background 0.2s'
                            }}>
                                <Send size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
