import { useState, useEffect, useRef } from 'react';
import { Search, Share2, User, MapPin } from 'lucide-react';

export default function Navbar({ onLocationSelect }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setShowResults(true);

        try {
            // Nominatim Search API
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await response.json();
            setResults(data);
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectResult = (location) => {
        // Pass extracted data to parent
        onLocationSelect({
            lat: parseFloat(location.lat),
            lng: parseFloat(location.lon),
            name: location.display_name.split(',')[0], // Simple name
            fullAddress: location.display_name
        });
        setShowResults(false);
        setQuery(location.display_name.split(',')[0]); // Update input
    };

    return (
        <nav style={{
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 3rem',
            backgroundColor: 'transparent',
            position: 'sticky',
            top: 0,
            zIndex: 5000
        }}>
            {/* Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 className="font-serif" style={{
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    color: 'var(--pk-text-main)',
                    letterSpacing: '-0.02em'
                }}>
                    慵懶旅誌
                </h1>
                <span className="font-hand" style={{
                    fontSize: '1.2rem',
                    color: 'var(--pk-primary)',
                    transform: 'rotate(-5deg)',
                    marginTop: '5px'
                }}>
                    Lazy Travelogue
                </span>
            </div>

            {/* Search Bar Container */}
            <div
                ref={searchRef}
                style={{
                    position: 'relative',
                    width: '320px',
                }}
            >
                <form onSubmit={handleSearch} style={{ position: 'relative' }}>
                    <Search size={18} style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--pk-text-muted)'
                    }} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="搜尋地點..."
                        style={{
                            width: '100%',
                            padding: '10px 16px 10px 40px',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--pk-border)',
                            background: 'var(--pk-surface-alt)',
                            color: 'var(--pk-text-main)',
                            fontFamily: 'var(--font-sans)',
                            fontSize: '0.95rem',
                            outline: 'none',
                            transition: 'all 0.2s ease'
                        }}
                        onFocus={() => {
                            if (results.length > 0) setShowResults(true);
                        }}
                    />
                </form>

                {/* Results Dropdown */}
                {showResults && (
                    <div style={{
                        position: 'absolute',
                        top: '110%',
                        left: 0,
                        width: '100%',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        backgroundColor: '#fff',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-float)',
                        border: '1px solid var(--pk-border)',
                        padding: '0.5rem 0',
                        zIndex: 1000
                    }}>
                        {isLoading ? (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--pk-text-muted)' }}>
                                搜尋中...
                            </div>
                        ) : results.length > 0 ? (
                            results.map((item) => (
                                <div
                                    key={item.place_id}
                                    onClick={() => handleSelectResult(item)}
                                    style={{
                                        padding: '8px 16px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        transition: 'background 0.1s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <MapPin size={14} className="text-muted" style={{ flexShrink: 0 }} />
                                    <div style={{ overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 500, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {item.display_name.split(',')[0]}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--pk-text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                            {item.display_name}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--pk-text-muted)' }}>
                                找不到結果
                            </div>
                        )}

                        {/* Attribution */}
                        <div style={{
                            borderTop: '1px solid var(--pk-border)',
                            padding: '4px 8px',
                            fontSize: '0.65rem',
                            color: 'var(--pk-text-muted)',
                            textAlign: 'center',
                            marginTop: '4px'
                        }}>
                            Data © OpenStreetMap contributors
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-lg)',
                    background: '#fff',
                    border: '1px solid var(--pk-border)',
                    color: 'var(--pk-text-main)',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                }}>
                    <Share2 size={18} />
                    <span>分享</span>
                </button>

                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--pk-primary), var(--pk-secondary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    cursor: 'pointer'
                }}>
                    <User size={20} />
                </div>
            </div>
        </nav>
    );
}
