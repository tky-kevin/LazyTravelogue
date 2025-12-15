import { useState, useRef } from 'react';
import { Search, Share2, User, LogOut } from 'lucide-react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { useItinerary } from '../context/ItineraryContext';

// Libraries needed for Google Maps
const LIBRARIES = ['places', 'marker'];

export default function Navbar({ onLocationSelect }) {
    const { user, logout } = useItinerary();
    const [searchResult, setSearchResult] = useState(null);
    const searchInputRef = useRef(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: LIBRARIES
    });

    const onLoad = (autocomplete) => {
        setSearchResult(autocomplete);
    };

    const onPlaceChanged = () => {
        if (searchResult !== null) {
            const place = searchResult.getPlace();

            if (!place.geometry || !place.geometry.location) {
                console.log("Returned place contains no geometry");
                return;
            }

            onLocationSelect({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                name: place.name,
                fullAddress: place.formatted_address,
                placeId: place.place_id,
                rating: place.rating,
                user_ratings_total: place.user_ratings_total
            });
        } else {
            console.log('Autocomplete is not loaded yet!');
        }
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
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="搜尋地點..."
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white/80 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none font-sans text-sm text-gray-800 placeholder-gray-400 shadow-sm"
                            />
                        </div>
                    </Autocomplete>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
                <button className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm">
                    <Share2 size={18} />
                    <span>分享</span>
                </button>

                {user ? (
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-white shadow-md cursor-pointer">
                                {user.picture ? (
                                    <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
                                        <User size={20} />
                                    </div>
                                )}
                            </div>

                            {/* Simple Dropdown for Logout */}
                            <div className="absolute right-0 top-12 w-32 bg-white rounded-lg shadow-xl border border-gray-100 py-1 hidden group-hover:block">
                                <button
                                    onClick={logout}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <LogOut size={14} />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                        <User size={20} />
                    </div>
                )}
            </div>
        </nav>
    );
}
