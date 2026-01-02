import { History, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const SearchHistory = ({ recentSearches, onRecentClick }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -5, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -5, scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{ originY: 0 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 overflow-hidden z-50"
        >
            <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 flex items-center gap-1">
                <History size={12} />
                <span>最近搜尋</span>
            </div>
            {recentSearches.map((item) => (
                <button
                    key={item.place_id}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        onRecentClick(item);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex flex-col gap-0.5 transition-colors group/item"
                >
                    <span className="text-sm text-gray-700 font-medium group-hover/item:text-primary transition-colors truncate w-full">
                        {item.name}
                    </span>
                    <span className="text-xs text-gray-400 truncate w-full flex items-center gap-1">
                        <Clock size={10} />
                        {item.address}
                    </span>
                </button>
            ))}
        </motion.div>
    );
};

export default SearchHistory;
