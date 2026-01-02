import { motion } from 'framer-motion';
import MarkdownContent from './MarkdownContent';
import ItineraryPreview from './ItineraryPreview';

const ChatMessage = ({ msg, idx, totalMessages, isLoading, onSuggestionClick, onImportPlan }) => {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '1rem'
            }}
        >
            <div style={{
                backgroundColor: msg.role === 'user' ? '#14b8a6' : '#fff',
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
                    <div className="mt-2 pt-2 border-t border-[#e2e8e0] text-[0.65rem] text-gray-500">
                        <p className="font-semibold mb-1">參考來源：</p>
                        <ul className="list-disc pl-3 space-y-0.5">
                            {msg.sources.map((src, i) => (
                                <li key={i}>
                                    <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
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
                        onImport={() => onImportPlan(msg.plan)}
                    />
                )}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px', padding: '0 4px' }}>
                {msg.role === 'user' ? '你' : 'AI'}
            </span>

            {/* Dynamic Suggestions - Show only on the latest AI message */}
            {msg.role === 'assistant' && idx === totalMessages - 1 && msg.suggestions && msg.suggestions.length > 0 && !isLoading && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {msg.suggestions.map((suggestion, sIdx) => (
                        <button
                            key={sIdx}
                            onClick={() => onSuggestionClick(suggestion)}
                            className="px-3 py-1.5 bg-white border border-teal-100 text-primary rounded-full text-xs hover:bg-teal-50 transition-colors shadow-sm font-medium"
                        >
                            {suggestion.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ChatMessage;
