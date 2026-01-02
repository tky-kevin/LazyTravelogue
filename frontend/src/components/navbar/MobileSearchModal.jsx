import { useState, useRef, useEffect } from 'react';
import { Search, X, Clock, MapPin } from 'lucide-react';
import { Autocomplete } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileSearchModal({
    isOpen,
    onClose,
    isLoaded,
    recentSearches,
    onRecentClick,
    onPlaceSelect,
    saveRecentSearch
}) {
    const [inputValue, setInputValue] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const inputRef = useRef(null);

    // Auto focus input when opening
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 150);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const onLoad = (autocomplete) => {
        setSearchResult(autocomplete);
    };

    const onPlaceChanged = () => {
        if (searchResult !== null) {
            const place = searchResult.getPlace();
            if (!place.geometry?.location) return;

            onPlaceSelect(place);
            saveRecentSearch(place);
            // Don't close immediately here if we want to show it was selected? No, usually close.
            // But let parent handle closing via the prop change usually, but here we just call onClose()
            onClose();
        }
    };

    const handleRecentClick = (item) => {
        onRecentClick(item);
        onClose();
    };

    const clearSearch = () => {
        setInputValue('');
        inputRef.current?.focus();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: '100%' }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: '100%' }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="fixed inset-0 z-[100] flex flex-col bg-white"
                >
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shadow-sm z-10">
                        <button
                            onClick={onClose}
                            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <X size={20} className="text-gray-600" />
                        </button>

                        {isLoaded && (
                            <div className="flex-1">
                                <Autocomplete
                                    onLoad={onLoad}
                                    onPlaceChanged={onPlaceChanged}
                                >
                                    <div className="relative">
                                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            placeholder="搜尋地點..."
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-sans text-base text-gray-800 placeholder-gray-400"
                                        />
                                        {inputValue && (
                                            <button
                                                onClick={clearSearch}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                </Autocomplete>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        {/* Recent Searches */}
                        {recentSearches.length > 0 && !inputValue && (
                            <div className="px-4 py-3">
                                <div className="flex items-center gap-2 text-gray-500 mb-3">
                                    <Clock size={14} />
                                    <span className="text-xs font-medium uppercase tracking-wide">最近搜尋</span>
                                </div>
                                <div className="space-y-1">
                                    {recentSearches.map((item, index) => (
                                        <button
                                            key={item.place_id || index}
                                            onClick={() => handleRecentClick(item)}
                                            className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                                                <MapPin size={18} className="text-gray-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-800 truncate">{item.name}</p>
                                                <p className="text-sm text-gray-500 truncate">{item.address}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty state when no recent searches */}
                        {recentSearches.length === 0 && !inputValue && (
                            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                                    <Search size={28} className="text-gray-400" />
                                </div>
                                <p className="text-gray-500 text-sm">搜尋景點、餐廳或任何地點</p>
                            </div>
                        )}

                        {/* Hint when typing */}
                        {inputValue && (
                            <div className="px-4 py-6 text-center text-gray-500 text-sm">
                                從下方選擇搜尋結果
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
