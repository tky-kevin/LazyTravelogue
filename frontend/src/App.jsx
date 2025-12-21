import { useState, useMemo, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Map, List } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import ItineraryPanel from './components/ItineraryPanel';
import MapPanel from './components/MapPanel';
import AIAssistant from './components/AIAssistant';
import { useItinerary } from './context/ItineraryContext';
import { useItineraryActions } from './hooks/useItineraryActions';
import { recalculateDayTimeline } from './utils/timeUtils';

function App() {
  const {
    user,
    login,
    currentItinerary,
    activeDay,
    setActiveDay,
    selectedLocation,
    setSelectedLocation
  } = useItinerary();

  const {
    handleAddLocation,
    handleUpdateItinerary,
    handleUpdateTransportMode,
    handleUpdateStayDuration,
    handleUpdateStartTime,
    handleUpdateDateRange,
    handleDirectionsFetched,
    handleDirectionsError,
    handleReorderDays,
    handleRemoveItem
  } = useItineraryActions();

  const [focusedLocation, setFocusedLocation] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'map'

  // 1. Data Preparation
  // We assume currentItinerary.days is always an Array due to backend standardization.
  // We need to transform this Array into the format expected by the legacy components (Object { "Day 1": [...] })
  // until those components are also refactored, OR we keep this transformation simple.

  const daysData = useMemo(() => {
    if (!currentItinerary?.days) return { "Day 1": [] };

    // Transform List[Day] -> Object { "id": [activities] } for easy access by day ID/Date
    const map = {};
    if (Array.isArray(currentItinerary.days)) {
      currentItinerary.days.forEach(d => {
        map[d.id] = d.activities || [];
        // We also map by "Day X" string if that's what activeDay uses, 
        // essentially satisfying both ID and legacy "Day N" usage if they differ.
        if (d.date) map[d.date] = d.activities || [];
      });
    } else {
      // Fallback (Should typically not be hit if we are strict, but good for safety during migration)
      return currentItinerary.days;
    }
    return map;
  }, [currentItinerary]);

  const startTimes = currentItinerary?.start_times || { "Day 1": "09:00" };
  const activeDayLabel = useMemo(() => {
    if (!currentItinerary?.days) return "Day 1";
    const found = currentItinerary.days.find(d => d.id === activeDay);
    return found?.date || "Day 1";
  }, [currentItinerary, activeDay]);

  // Calculate Timeline
  const calculatedItinerary = useMemo(() => {
    // If activeDay is not found in daysData, default to empty array
    const currentActivities = daysData[activeDay] || [];
    const startTime = startTimes[activeDay] || '09:00';

    return {
      ...daysData,
      [activeDay]: recalculateDayTimeline(currentActivities, startTime)
    };
  }, [daysData, startTimes, activeDay]);


  // Auto-switch to map view when a location is selected (for mobile)
  useEffect(() => {
    if (selectedLocation) {
      setMobileView('map');
    }
  }, [selectedLocation]);

  // 4. Main App Render Login if no user
  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <Toaster position="top-center" />
        <h1 className="text-4xl font-serif font-bold text-gray-800 mb-8">LazyTravelogue</h1>
        <div className="p-8 bg-white rounded-xl shadow-lg text-center">
          <p className="text-gray-600 mb-4">Please sign in to continue</p>
          <GoogleLogin
            onSuccess={login}
            onError={() => console.log('Login Failed')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col font-sans text-gray-900">
      <Toaster position="top-right" />
      <Navbar onLocationSelect={(loc) => {
        setSelectedLocation(loc);
      }} />

      <main className="flex-1 grid grid-cols-1 md:grid-cols-[minmax(400px,1fr)_2fr] gap-0 md:gap-8 px-0 md:px-12 pb-0 md:pb-8 overflow-hidden relative">
        {/* Left: Itinerary Panel */}
        <div className={`h-full overflow-hidden ${mobileView === 'map' ? 'hidden md:block' : 'block'}`}>
          <ItineraryPanel
            activeDay={activeDay}
            onDayChange={setActiveDay}
            itineraryData={calculatedItinerary}
            activeDayLabel={activeDayLabel}
            days={currentItinerary?.days || []}
            startDate={currentItinerary?.start_date ? new Date(currentItinerary.start_date) : new Date()}
            endDate={currentItinerary?.end_date ? new Date(currentItinerary.end_date) : new Date()}
            onUpdateDateRange={handleUpdateDateRange}
            onReorderDays={handleReorderDays}
            onRemoveItem={handleRemoveItem}
            startTime={startTimes[activeDay] || '09:00'}
            onUpdateStartTime={handleUpdateStartTime}
            onUpdateItinerary={handleUpdateItinerary}
            currentItineraryTitle={currentItinerary?.title}
            onUpdateItineraryTitle={(newTitle) => handleUpdateItinerary(null, null, { title: newTitle })}
            onLocationFocus={(loc) => {
              setFocusedLocation(loc);
              setMobileView('map');
            }}
            onUpdateTransportMode={handleUpdateTransportMode}
            onUpdateStayDuration={handleUpdateStayDuration}
          />
        </div>

        {/* Right: Map Panel */}
        <div className={`h-full relative ${mobileView === 'list' ? 'hidden md:block' : 'block'}`}>
          <MapPanel
            selectedLocation={selectedLocation}
            focusedLocation={focusedLocation}
            itineraryData={daysData} // Pass RAW data for map
            days={currentItinerary?.days || []}
            activeDay={activeDay}
            activeDayLabel={activeDayLabel}
            onLocationSelect={setSelectedLocation}
            onAddLocation={() => handleAddLocation(setMobileView)}
            onDirectionsFetched={handleDirectionsFetched}
            onDirectionsError={handleDirectionsError}
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

      <AIAssistant />
    </div>
  );
}

export default App;
