import ReactMarkdown from 'react-markdown';

const MarkdownContent = ({ content }) => {
    return (
        <ReactMarkdown
            components={{
                h1: ({ children }) => <h1 className="text-base font-bold mt-2 mb-1">{children}</h1>,
                h2: ({ children }) => <h2 className="text-sm font-bold mt-2 mb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mt-1.5 mb-0.5">{children}</h3>,
                p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                li: ({ children }) => <li className="text-[0.85rem]">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => (
                    <code className="bg-[#f1f5f9] px-1 py-0.5 rounded text-[0.8rem] text-primary">
                        {children}
                    </code>
                ),
                a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {children}
                    </a>
                ),
                blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-[#d0d9cd] pl-2 my-1 text-gray-600 italic">
                        {children}
                    </blockquote>
                ),
            }}
        >
            {content}
        </ReactMarkdown>
    );
};

export default MarkdownContent;
