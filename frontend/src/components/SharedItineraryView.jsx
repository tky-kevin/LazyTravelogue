import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { Map, List } from 'lucide-react';
import client from '../api/client';
import ItineraryPanel from './ItineraryPanel';
import MapPanel from './MapPanel';
import { recalculateDayTimeline } from '../utils/timeUtils';

export default function SharedItineraryView() {
    const { token } = useParams();
    const [itinerary, setItinerary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeDay, setActiveDay] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [mobileView, setMobileView] = useState('list');
    const [focusedLocation, setFocusedLocation] = useState(null);

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        client.get(`/api/public/itineraries/${token}`)
            .then(res => {
                setItinerary(res.data);
                if (res.data.days && res.data.days.length > 0) {
                    setActiveDay(res.data.days[0].id);
                }
            })
            .catch(() => {
                toast.error("無法讀取行程，可能連結已失效或不公開");
            })
            .finally(() => setLoading(false));
    }, [token]);

    // Data Transformation (Similar to App.jsx)
    const daysData = useMemo(() => {
        if (!itinerary?.days) return { "Day 1": [] };
        const map = {};
        itinerary.days.forEach(d => {
            map[d.id] = d.activities || [];
            if (d.date) map[d.date] = d.activities || [];
        });
        return map;
    }, [itinerary]);

    const activeDayLabel = useMemo(() => {
        if (!itinerary?.days) return "Day 1";
        const found = itinerary.days.find(d => d.id === activeDay);
        return found?.date || "Day 1";
    }, [itinerary, activeDay]);

    const calculatedItinerary = useMemo(() => {
        const currentActivities = daysData[activeDay] || [];
        // Default start time if not present
        const startTime = itinerary?.start_times?.[activeDay] || '09:00';

        return {
            ...daysData,
            [activeDay]: recalculateDayTimeline(currentActivities, startTime, activeDayLabel)
        };
    }, [daysData, itinerary, activeDay, activeDayLabel]);

    if (loading) {
        return <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-gray-500">載入中...</div>;
    }

    if (!itinerary) {
        return <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-gray-500">找不到此行程</div>;
    }

    // Dummy No-ops for read-only
    const noOp = () => { };

    return (
        <div className="h-screen flex flex-col font-sans text-gray-900 bg-white">
            <Toaster position="top-center" />

            {/* Minimal Header */}
            <header className="px-6 py-3 border-b flex items-center justify-between bg-white shadow-sm z-10">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-serif font-bold text-primary">LazyTravelogue</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Shared View</span>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-1 md:grid-cols-[minmax(400px,1fr)_2fr] gap-0 md:gap-8 px-0 md:px-12 pb-0 md:pb-8 overflow-hidden relative">
                {/* Left: Itinerary Panel (ReadOnly) */}
                <div className={`h-full overflow-hidden ${mobileView === 'map' ? 'hidden md:block' : 'block'}`}>
                    <ItineraryPanel
                        activeDay={activeDay}
                        onDayChange={setActiveDay}
                        itineraryData={calculatedItinerary}
                        activeDayLabel={activeDayLabel}
                        days={itinerary.days || []}
                        startDate={itinerary.start_date ? new Date(itinerary.start_date) : new Date()}
                        endDate={itinerary.end_date ? new Date(itinerary.end_date) : new Date()}

                        // Read Only Props
                        readOnly={true}

                        // Dummy handlers
                        onUpdateDateRange={noOp}
                        onReorderDays={noOp}
                        onRemoveItem={noOp}
                        startTime={itinerary.start_times?.[activeDay] || '09:00'}
                        onUpdateStartTime={noOp}
                        onUpdateItinerary={noOp}
                        currentItineraryTitle={itinerary.title}
                        onUpdateItineraryTitle={noOp}
                        onLocationFocus={(loc) => {
                            setFocusedLocation(loc);
                            setMobileView('map');
                        }}
                        onUpdateTransportMode={noOp}
                        onUpdateStayDuration={noOp}
                        pocketList={[]} // Hide pocket in read-only
                        onMoveFromPocket={noOp}
                    />
                </div>

                {/* Right: Map Panel */}
                <div className={`h-full relative ${mobileView === 'list' ? 'hidden md:block' : 'block'}`}>
                    <MapPanel
                        selectedLocation={selectedLocation}
                        focusedLocation={focusedLocation}
                        itineraryData={calculatedItinerary}
                        days={itinerary.days || []}
                        activeDay={activeDay}
                        activeDayLabel={activeDayLabel}
                        onLocationSelect={setSelectedLocation}
                        // Read-only map: no adding
                        onAddLocation={null}
                        onAddToPocket={null}
                        // Directions fetching is internal to MapPanel, usually works fine if data is consistent
                        onDirectionsFetched={noOp}
                        onDirectionsError={console.warn}
                    />
                </div>

                {/* Mobile Toggle FAB */}
                <button
                    className="md:hidden fixed bottom-6 right-6 z-50 bg-primary text-white p-4 rounded-full shadow-2xl transition-transform active:scale-95 flex items-center justify-center"
                    onClick={() => setMobileView(prev => prev === 'list' ? 'map' : 'list')}
                    style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}
                >
                    {mobileView === 'list' ? <Map size={24} /> : <List size={24} />}
                </button>
            </main>
        </div>
    );
}
