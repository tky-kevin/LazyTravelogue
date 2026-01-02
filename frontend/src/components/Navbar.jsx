import { useState, useRef, useEffect } from 'react';
import { Search, Share2, User, LogOut, X, Map as MapIcon, ChevronDown, Bookmark, Presentation, Github } from 'lucide-react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { useItinerary } from '../context/ItineraryContext';
import { categorizePlace } from '../utils/placeUtils';
import client from '../api/client';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Sub-components
import { LIBRARIES } from './navbar/constants';
import SearchHistory from './navbar/SearchHistory';
import TripList from './navbar/TripList';
import PocketList from './navbar/PocketList';
import MobileSearchModal from './navbar/MobileSearchModal';

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

    const [inputValue, setInputValue] = useState("");
    const [recentSearches, setRecentSearches] = useState([]);
    const [showRecent, setShowRecent] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('recent_searches');
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved).slice(0, 5));
            } catch (e) { }
        }
    }, []);

    const saveRecentSearch = (place) => {
        const newEntry = {
            name: place.name,
            address: place.formatted_address,
            place_id: place.place_id,
            lat: place.geometry?.location?.lat(),
            lng: place.geometry?.location?.lng(),
            category: categorizePlace(place.types),
            rating: place.rating,
            user_ratings_total: place.user_ratings_total
        };

        setRecentSearches(prev => {
            const filtered = prev.filter(p => p.place_id !== place.place_id);
            const updated = [newEntry, ...filtered].slice(0, 5);
            localStorage.setItem('recent_searches', JSON.stringify(updated));
            return updated;
        });
    };

    const handleRecentClick = (item) => {
        if (item.lat && item.lng) {
            onLocationSelect({
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lng),
                name: item.name,
                fullAddress: item.address,
                placeId: item.place_id,
                rating: item.rating,
                user_ratings_total: item.user_ratings_total,
                category: item.category || 'other',
                _ts: Date.now()
            });
            setInputValue(item.name);
            setShowRecent(false);
            setIsMobileSearchOpen(false);
        } else {
            setInputValue(item.name);
            if (searchInputRef.current) searchInputRef.current.focus();
            setShowRecent(false);
        }
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
            if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
            if (tripsRef.current && !tripsRef.current.contains(event.target)) setIsTripsOpen(false);
            if (pocketRef.current && !pocketRef.current.contains(event.target)) setShowPocket(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [setShowPocket]);

    const onPlaceChanged = () => {
        if (searchResult !== null) {
            const place = searchResult.getPlace();
            if (!place.geometry?.location) return;

            onLocationSelect({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                name: place.name,
                fullAddress: place.formatted_address,
                placeId: place.place_id,
                rating: place.rating,
                user_ratings_total: place.user_ratings_total,
                category: categorizePlace(place.types),
                _ts: Date.now()
            });

            saveRecentSearch(place);
            setInputValue(place.name || place.formatted_address);
            setShowRecent(false);
            setIsMobileSearchOpen(false);
        }
    };

    // Handler for mobile modal place selection
    const handleMobilePlaceSelect = (place) => {
        onLocationSelect({
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            name: place.name,
            fullAddress: place.formatted_address,
            placeId: place.place_id,
            rating: place.rating,
            user_ratings_total: place.user_ratings_total,
            category: categorizePlace(place.types),
            _ts: Date.now()
        });
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
        <>
            <nav className="h-16 md:h-16 flex items-center justify-between px-4 md:px-8 py-1 bg-transparent sticky top-0 z-50 gap-2">
                <div className="flex items-center gap-2 shrink-0">
                    <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                    <h1 className="font-serif text-xl md:text-2xl font-semibold text-gray-800 tracking-tight whitespace-nowrap">慵懶旅誌</h1>
                </div>

                {/* Spacer to push everything to the right */}
                <div className="flex-1" />

                <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
                    {/* Mobile: Search Button */}
                    <button
                        onClick={() => setIsMobileSearchOpen(true)}
                        className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                    >
                        <Search size={18} className="" />
                    </button>

                    {/* Desktop: Full Search Bar */}
                    <div className="hidden md:block w-64 lg:w-80 relative">
                        {isLoaded && (
                            <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                                <div className="relative group">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        placeholder="搜尋地點..."
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onFocus={() => setShowRecent(true)}
                                        onBlur={() => setTimeout(() => setShowRecent(false), 200)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const pacItems = document.querySelectorAll('.pac-item');
                                                const hasSelection = document.querySelector('.pac-item-selected');

                                                if (pacItems.length > 0 && !hasSelection) {
                                                    e.preventDefault();
                                                    const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown', keyCode: 40, which: 40, bubbles: true });
                                                    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, which: 13, bubbles: true });
                                                    e.target.dispatchEvent(downEvent);
                                                    setTimeout(() => {
                                                        e.target.dispatchEvent(enterEvent);
                                                        searchInputRef.current?.blur();
                                                    }, 100);
                                                }
                                            }
                                        }}
                                        className="w-full pl-9 pr-9 py-1.5 border-b border-gray-300 bg-transparent focus:border-primary transition-colors outline-none font-sans text-sm text-gray-800 placeholder-gray-500"
                                    />
                                    {inputValue && (
                                        <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-all">
                                            <X size={14} />
                                        </button>
                                    )}
                                    <AnimatePresence>
                                        {showRecent && !inputValue && recentSearches.length > 0 && (
                                            <SearchHistory recentSearches={recentSearches} onRecentClick={handleRecentClick} />
                                        )}
                                    </AnimatePresence>
                                </div>
                            </Autocomplete>
                        )}
                    </div>
                    {user && (
                        <div className="relative" ref={tripsRef}>
                            <button onClick={() => setIsTripsOpen(!isTripsOpen)} className="flex items-center gap-1 md:gap-1.5 h-8 md:h-9 px-2 md:px-2.5 rounded-lg bg-transparent text-gray-600 font-medium hover:bg-gray-100 active:bg-gray-200 transition-colors text-xs md:text-sm">
                                <MapIcon size={16} className="text-gray-500 shrink-0 group-hover:text-gray-700 transition-colors" />
                                <span className="hidden md:inline">我的行程</span>
                                <ChevronDown size={12} className={`shrink-0 transition-transform duration-200 ${isTripsOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {isTripsOpen && (
                                    <TripList
                                        itineraries={itineraries}
                                        currentItinerary={currentItinerary}
                                        onSelect={(it) => { setCurrentItinerary(it); setIsTripsOpen(false); }}
                                        onCreate={() => {
                                            createItinerary({
                                                title: "新行程",
                                                days: [{ id: `day-${Date.now()}`, date: "Day 1", activities: [] }]
                                            });
                                            setIsTripsOpen(false);
                                        }}
                                        onDelete={(id) => { if (window.confirm('確定要刪除這個行程嗎？')) deleteItinerary(id); }}
                                        onClose={() => setIsTripsOpen(false)}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {user && (
                        <div className="relative" ref={pocketRef}>
                            <button
                                onClick={() => setShowPocket(!showPocket)}
                                className={`flex items-center gap-1 md:gap-1.5 h-8 md:h-9 px-2 md:px-2.5 rounded-lg transition-all text-xs md:text-sm font-medium ${showPocket ? 'bg-primary/10 text-primary' : 'bg-transparent text-gray-600 hover:bg-gray-100 active:bg-gray-200'}`}
                            >
                                <Bookmark size={16} className="text-gray-500 shrink-0 group-hover:text-gray-700 transition-colors" />
                                <span className="hidden md:inline">口袋名單</span>
                                {pocketList.length > 0 && (
                                    <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold bg-primary text-white">
                                        {pocketList.length}
                                    </span>
                                )}
                            </button>
                            <AnimatePresence>
                                {showPocket && (
                                    <PocketList
                                        pocketList={pocketList}
                                        onMoveToDay={onMoveFromPocket}
                                        onRemove={onRemoveItem}
                                        activeDay={activeDay}
                                        activeDayLabel={activeDayLabel}
                                        onClose={() => setShowPocket(false)}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    <a
                        href="https://www.canva.com/design/DAG4M_2YyQo/VrmRT-dKPmaOAs4-DcAwHQ/edit?utm_content=DAG4M_2YyQo&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:flex items-center justify-center md:justify-start gap-1.5 h-8 w-8 md:w-auto md:h-9 md:px-2.5 rounded-lg bg-transparent text-gray-600 hover:bg-amber-50 hover:text-amber-600 active:bg-amber-100 transition-all group whitespace-nowrap"
                        title="專案簡報"
                    >
                        <Presentation size={18} className="text-gray-500 group-hover:text-gray-700 transition-colors" />
                        <span className="hidden xl:inline text-sm font-medium">專案簡報</span>
                    </a>

                    <a
                        href="https://github.com/tky-kevin/LazyTravelogue"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:flex items-center justify-center md:justify-start gap-1.5 h-8 w-8 md:w-auto md:h-9 md:px-2.5 rounded-lg bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200 transition-all group whitespace-nowrap"
                        title="GitHub"
                    >
                        <Github size={18} className="text-gray-500 group-hover:text-gray-900 transition-colors" />
                        <span className="hidden xl:inline text-sm font-medium">GitHub</span>
                    </a>


                    <button
                        onClick={handleShare}
                        className="flex items-center justify-center md:justify-start gap-1.5 h-8 w-8 md:w-auto md:h-9 md:px-2.5 rounded-lg bg-transparent text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 active:bg-emerald-100 transition-all group whitespace-nowrap"
                        title="分享行程"
                    >
                        <Share2 size={18} className="text-gray-500 group-hover:text-emerald-600 transition-colors" />
                        <span className="hidden md:inline text-sm font-medium">分享</span>
                    </button>

                    {user ? (
                        <div className="flex items-center gap-2">
                            <div className="relative" ref={menuRef}>
                                <div onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden border-2 border-white shadow-sm cursor-pointer">
                                    {user.picture ? (
                                        <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white"><User size={20} /></div>
                                    )}
                                </div>
                                <AnimatePresence>
                                    {isMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                            transition={{ duration: 0.15 }}
                                            className="absolute right-0 top-10 w-32 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50 origin-top-right"
                                        >
                                            <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2">
                                                <LogOut size={14} /> 登出
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    ) : (
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-400"><User size={18} /></div>
                    )}
                </div>
            </nav>

            {/* Mobile Search Modal */}
            <MobileSearchModal
                isOpen={isMobileSearchOpen}
                onClose={() => setIsMobileSearchOpen(false)}
                isLoaded={isLoaded}
                recentSearches={recentSearches}
                onRecentClick={handleRecentClick}
                onPlaceSelect={handleMobilePlaceSelect}
                saveRecentSearch={saveRecentSearch}
            />
        </>
    );
}
