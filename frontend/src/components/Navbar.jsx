import { useState, useRef, useEffect } from 'react';
import { Search, Share2, User, LogOut, X, Clock, History, Map as MapIcon, Plus, Trash2, ChevronDown, Check, Bookmark, Coffee, Hotel, Camera, MapPin } from 'lucide-react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { useItinerary } from '../context/ItineraryContext';
import { categorizePlace } from '../utils/placeUtils';
import client from '../api/client';
import toast from 'react-hot-toast';

// Libraries needed for Google Maps
const LIBRARIES = ['places', 'marker'];

// Helper for Icons (shared or moved here for Navbar usage)
const getCategoryIcon = (category) => {
    switch (category) {
        case 'food': return <Coffee size={18} />;
        case 'hotel': return <Hotel size={18} />;
        case 'scenic': return <Camera size={18} />;
        default: return <MapPin size={18} />;
    }
};

export default function Navbar({ onLocationSelect, pocketList = [], onMoveFromPocket, onRemoveItem, activeDay, activeDayLabel }) {
    const {
        user,
        logout,
        itineraries,
        currentItinerary,
        setCurrentItinerary,
        createItinerary,
        deleteItinerary,
        showPocket,
        setShowPocket
    } = useItinerary();
    const [searchResult, setSearchResult] = useState(null);
    const searchInputRef = useRef(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: LIBRARIES,
        language: 'zh-TW'
    });

    const onLoad = (autocomplete) => {
        setSearchResult(autocomplete);
    };

    // --- Search Improvements ---
    const [inputValue, setInputValue] = useState("");
    const [recentSearches, setRecentSearches] = useState([]);
    const [showRecent, setShowRecent] = useState(false);

    // Load recent searches on mount
    useEffect(() => {
        const saved = localStorage.getItem('recent_searches');
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved).slice(0, 5));
            } catch (e) { /* ignore parse error */ }
        }
    }, []);

    const saveRecentSearch = (place) => {
        const newEntry = {
            name: place.name,
            address: place.formatted_address,
            place_id: place.place_id
        };

        setRecentSearches(prev => {
            // Remove dupe by place_id
            const filtered = prev.filter(p => p.place_id !== place.place_id);
            const updated = [newEntry, ...filtered].slice(0, 5);
            localStorage.setItem('recent_searches', JSON.stringify(updated));
            return updated;
        });
    };

    const handleRecentClick = (item) => {
        // Technically we can't fully emulate an Autocomplete selection without fetching details.
        // But for UX, we can just populate the input. User still needs to select from Google's list 
        // to get the full geometry if we assume 'item' is partial.
        // However, if we want to "Restore" a search, we might need a different flow.
        // For now: Just populate input and let them click or re-search.
        setInputValue(item.name);
        if (searchInputRef.current) searchInputRef.current.focus();
        setShowRecent(false);
    };

    const clearSearch = () => {
        setInputValue("");
        if (searchInputRef.current) searchInputRef.current.value = "";
    };

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isTripsOpen, setIsTripsOpen] = useState(false);
    const menuRef = useRef(null);
    const tripsRef = useRef(null);
    const pocketRef = useRef(null);



    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
            if (tripsRef.current && !tripsRef.current.contains(event.target)) {
                setIsTripsOpen(false);
            }
            if (pocketRef.current && !pocketRef.current.contains(event.target)) {
                setShowPocket(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [setShowPocket]);

    const onPlaceChanged = () => {
        if (searchResult !== null) {
            const place = searchResult.getPlace();

            if (!place.geometry || !place.geometry.location) {
                return;
            }

            onLocationSelect({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                name: place.name,
                fullAddress: place.formatted_address,
                placeId: place.place_id,
                rating: place.rating,
                user_ratings_total: place.user_ratings_total,
                category: categorizePlace(place.types)
            });

            // Save to history
            saveRecentSearch(place);
            setInputValue(place.name || place.formatted_address);
            setShowRecent(false);
        }
    };

    const handleShare = async () => {
        const itineraryId = currentItinerary?._id || currentItinerary?.id;
        if (!itineraryId) return toast.error("無法分享：未找到行程 ID");

        const promise = client.put(`/api/itineraries/${itineraryId}/share`, { is_public: true })
            .then(res => res.data.share_token);

        toast.promise(promise, {
            loading: '正在產生分享連結...',
            success: (token) => {
                const url = `${window.location.origin}/share/${token}`;
                navigator.clipboard.writeText(url);
                return '連結已複製到剪貼簿！';
            },
            error: (err) => `分享失敗: ${err.message}`
        });
    };

    return (
        <nav className="h-16 md:h-20 flex items-center justify-between px-4 md:px-12 bg-transparent sticky top-0 z-50">
            {/* Brand */}
            <div className="flex items-center gap-2 shrink-0">
                <h1 className="font-serif text-xl md:text-2xl font-semibold text-gray-800 tracking-tight">
                    慵懶旅誌
                </h1>
                <span className="hidden md:block font-hand text-xl text-primary -rotate-6 mt-1.5 transform">
                    Lazy Travelogue
                </span>
            </div>

            {/* Search Bar Container */}
            <div className="flex-1 max-w-sm mx-4 relative">
                {isLoaded && (
                    <Autocomplete
                        onLoad={onLoad}
                        onPlaceChanged={onPlaceChanged}
                    >
                        <div className="relative group">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="搜尋地點..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onFocus={() => setShowRecent(true)}
                                onBlur={() => setTimeout(() => setShowRecent(false), 200)} // Delay for click
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const pacItems = document.querySelectorAll('.pac-item');
                                        const hasSelection = document.querySelector('.pac-item-selected');

                                        if (pacItems.length > 0 && !hasSelection) {
                                            e.preventDefault();

                                            // Simulate ArrowDown + Enter
                                            const downEvent = new KeyboardEvent('keydown', {
                                                key: 'ArrowDown', keyCode: 40, which: 40, bubbles: true
                                            });
                                            const enterEvent = new KeyboardEvent('keydown', {
                                                key: 'Enter', keyCode: 13, which: 13, bubbles: true
                                            });

                                            e.target.dispatchEvent(downEvent);
                                            setTimeout(() => {
                                                e.target.dispatchEvent(enterEvent);
                                                // Force blur to close any mobile keyboards
                                                searchInputRef.current?.blur();
                                            }, 100);
                                        }
                                    }
                                }}
                                className="w-full pl-10 pr-10 py-2 rounded-xl border border-gray-200 bg-white/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-sans text-sm text-gray-800 placeholder-gray-400 shadow-sm"
                            />

                            {/* Clear Button */}
                            {inputValue && (
                                <button
                                    onClick={clearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-all"
                                >
                                    <X size={14} />
                                </button>
                            )}

                            {/* Recent Searches Dropdown */}
                            {showRecent && !inputValue && recentSearches.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                                    <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 flex items-center gap-1">
                                        <History size={12} />
                                        <span>最近搜尋</span>
                                    </div>
                                    {recentSearches.map((item) => (
                                        <button
                                            key={item.place_id}
                                            onClick={() => handleRecentClick(item)}
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
                                </div>
                            )}
                        </div>
                    </Autocomplete>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
                {user && (
                    <div className="relative" ref={tripsRef}>
                        <button
                            onClick={() => setIsTripsOpen(!isTripsOpen)}
                            className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm text-sm"
                        >
                            <MapIcon size={18} className="text-primary" />
                            <span className="hidden sm:inline">我的行程</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isTripsOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isTripsOpen && (
                            <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="px-4 py-2 border-b border-gray-50 flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">最近行程</span>
                                    <button
                                        onClick={() => {
                                            createItinerary({
                                                title: "新行程",
                                                days: [{ id: `day-${Date.now()}`, date: "Day 1", activities: [] }]
                                            });
                                            setIsTripsOpen(false);
                                        }}
                                        className="p-1 hover:bg-primary/10 rounded-full text-primary transition-colors"
                                        title="新增行程"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                                <div className="max-h-60 overflow-y-auto py-1">
                                    {itineraries.map((it) => (
                                        <div
                                            key={it._id || it.id}
                                            className={`group w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors ${(currentItinerary?._id || currentItinerary?.id) === (it._id || it.id) ? 'bg-primary/5' : ''}`}
                                            onClick={() => {
                                                setCurrentItinerary(it);
                                                setIsTripsOpen(false);
                                            }}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${(currentItinerary?._id || currentItinerary?.id) === (it._id || it.id) ? 'bg-primary' : 'bg-transparent'}`} />
                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                    <span className={`text-sm font-medium truncate ${(currentItinerary?._id || currentItinerary?.id) === (it._id || it.id) ? 'text-primary' : 'text-gray-700'}`}>
                                                        {it.title || "未命名行程"}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {it.days?.length || 0} 天之旅
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {(currentItinerary?._id || currentItinerary?.id) === (it._id || it.id) && (
                                                    <Check size={14} className="text-primary" />
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm('確定要刪除這個行程嗎？')) {
                                                            deleteItinerary(it._id || it.id);
                                                        }
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}



                {user && (
                    <div className="relative" ref={pocketRef}>
                        <button
                            onClick={() => setShowPocket(!showPocket)}
                            className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl border transition-all shadow-sm text-sm font-medium ${showPocket ? 'bg-primary/10 text-primary border-primary/20' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            title="口袋名單"
                        >
                            <Bookmark size={18} />
                            <span className="hidden sm:inline">口袋名單</span>
                            {pocketList.length > 0 && (
                                <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${showPocket ? 'bg-primary text-white' : 'bg-primary text-white'}`}>
                                    {pocketList.length}
                                </span>
                            )}
                        </button>

                        {showPocket && (
                            <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[450px]">
                                <div className="px-5 py-2 border-b border-gray-50">
                                    <h3 className="text-sm font-bold text-gray-800">口袋名單</h3>
                                    <p className="text-[10px] text-gray-400">目前收藏的地點</p>
                                </div>
                                <div className="overflow-y-auto px-2 py-2 flex-1">
                                    {pocketList.length > 0 ? (
                                        pocketList.map((item) => (
                                            <div
                                                key={item.id}
                                                className="group p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-50 last:border-0"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-gray-100 rounded-md text-gray-500 shrink-0">
                                                        {getCategoryIcon(item.category)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-xs font-bold text-gray-700 truncate">{item.title}</h4>
                                                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.description}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <button
                                                            onClick={() => onMoveFromPocket(activeDay, item)}
                                                            className="p-1.5 text-primary hover:bg-primary/10 rounded-full transition-all"
                                                            title={`加入 ${activeDayLabel || activeDay}`}
                                                        >
                                                            <Plus size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => onRemoveItem && onRemoveItem('pocket', item.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                                            title="從口袋移除"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-8 text-center opacity-30">
                                            <Bookmark size={32} className="mx-auto mb-2" />
                                            <p className="text-xs italic">口袋裡目前沒有景點</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <button
                    onClick={handleShare}
                    className="flex items-center justify-center p-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm group"
                    title="分享行程"
                >
                    <Share2 size={18} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
                </button>

                {user ? (
                    <div className="flex items-center gap-3">
                        <div className="relative" ref={menuRef}>
                            <div
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-white shadow-md cursor-pointer"
                            >
                                {user.picture ? (
                                    <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                                        <User size={20} />
                                    </div>
                                )}
                            </div>

                            {/* Simple Dropdown for Logout */}
                            {isMenuOpen && (
                                <div className="absolute right-0 top-12 w-32 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button
                                        onClick={logout}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <LogOut size={14} />
                                        登出
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                        <User size={20} />
                    </div>
                )}
            </div>
        </nav >
    );
}
