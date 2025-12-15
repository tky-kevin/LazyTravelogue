import { useState, useMemo, useCallback } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Map, List } from 'lucide-react';
import Navbar from './components/Navbar';
import ItineraryPanel from './components/ItineraryPanel';
import MapPanel from './components/MapPanel';
import AIAssistant from './components/AIAssistant';
import { useItinerary } from './context/ItineraryContext';
import { recalculateDayTimeline } from './utils/timeUtils';

function App() {
  const {
    user,
    login,
    currentItinerary,
    updateItinerary,
    activeDay,
    setActiveDay,
    selectedLocation,
    setSelectedLocation
  } = useItinerary();

  const [focusedLocation, setFocusedLocation] = useState(null);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'map'

  // 1. Data Preparation (Hooks must run unconditionally)
  const daysData = currentItinerary?.days || { "Day 1": [] };
  const startTimes = currentItinerary?.start_times || { "Day 1": "09:00" };

  // Calculate Timeline
  const calculatedItinerary = useMemo(() => {
    return {
      ...daysData,
      [activeDay]: recalculateDayTimeline(daysData[activeDay] || [], startTimes[activeDay] || '09:00')
    };
  }, [daysData, startTimes, activeDay]);


  // 2. Handlers (Adapting to Context API)
  const handleAddLocation = () => {
    if (!selectedLocation || !currentItinerary) return; // Guard clause

    const newItem = {
      id: `loc-${Date.now()}`,
      title: selectedLocation.name,
      category: '觀光',
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      description: selectedLocation.fullAddress,
      transportMode: 'DRIVING',
      stayDuration: 60,
      durationValue: 0
    };

    const currentDayItems = daysData[activeDay] || [];
    const newItems = [...currentDayItems, newItem];

    // Update Context
    updateItinerary(currentItinerary._id, {
      days: {
        ...daysData,
        [activeDay]: newItems
      }
    });

    console.log(`Added ${selectedLocation.name} to ${activeDay}`);
    // Switch to list view on mobile to see the new item
    setMobileView('list');
  };

  const handleUpdateItinerary = (dayId, newItems) => {
    if (!currentItinerary) return;
    updateItinerary(currentItinerary._id, {
      days: {
        ...daysData,
        [dayId]: newItems
      }
    });
  };

  const handleUpdateTransportMode = (dayId, itemId, newMode) => {
    if (!currentItinerary) return;
    const dayItems = daysData[dayId] || [];
    const updatedItems = dayItems.map(item =>
      item.id === itemId ? { ...item, transportMode: newMode } : item
    );

    updateItinerary(currentItinerary._id, {
      days: {
        ...daysData,
        [dayId]: updatedItems
      }
    });
  };

  const handleUpdateStayDuration = (dayId, itemId, newDuration) => {
    if (!currentItinerary) return;
    const dayItems = daysData[dayId] || [];
    const updatedItems = dayItems.map(item =>
      item.id === itemId ? { ...item, stayDuration: parseInt(newDuration) || 0 } : item
    );

    updateItinerary(currentItinerary._id, {
      days: {
        ...daysData,
        [dayId]: updatedItems
      }
    });
  };

  const handleUpdateStartTime = (newTime) => {
    if (!currentItinerary) return;
    updateItinerary(currentItinerary._id, {
      start_times: {
        ...startTimes,
        [activeDay]: newTime
      }
    });
  };

  // Map Callbacks
  const handleDirectionsFetched = useCallback((dayId, fromItemId, result) => {
    if (!currentItinerary) return;

    const dayItems = daysData[dayId] || [];
    const targetItem = dayItems.find(i => i.id === fromItemId);

    if (targetItem && targetItem.duration === result.duration.text && targetItem.durationValue === result.duration.value) {
      return;
    }

    const updatedItems = dayItems.map(item =>
      item.id === fromItemId ? {
        ...item,
        duration: result.duration.text,
        durationValue: result.duration.value,
        distance: result.distance.text
      } : item
    );

    updateItinerary(currentItinerary._id, {
      days: {
        ...daysData,
        [dayId]: updatedItems
      }
    });

  }, [daysData, currentItinerary, updateItinerary]);

  const handleDirectionsError = useCallback((dayId, fromItemId, status) => {
    if (!currentItinerary) return;

    if (status === 'ZERO_RESULTS' || status === 'NOT_FOUND') {
      const dayItems = daysData[dayId] || [];
      const targetItem = dayItems.find(i => i.id === fromItemId);

      if (targetItem && targetItem.transportMode === 'TRANSIT') {
        const updatedItems = dayItems.map(item =>
          item.id === fromItemId ? { ...item, transportMode: 'WALKING' } : item
        );

        updateItinerary(currentItinerary._id, {
          days: {
            ...daysData,
            [dayId]: updatedItems
          }
        });
      }
    }
  }, [daysData, currentItinerary, updateItinerary]);

  // 3. Render Login if no user
  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-4xl font-serif font-bold text-gray-800 mb-8">Lazy Travelogue</h1>
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
      <Navbar onLocationSelect={(loc) => {
        setSelectedLocation(loc);
        setMobileView('map'); // Switch to map when searching to see the pin
      }} />

      <main className="flex-1 grid grid-cols-1 md:grid-cols-[minmax(400px,1fr)_2fr] gap-0 md:gap-8 px-0 md:px-12 pb-0 md:pb-8 overflow-hidden relative">
        {/* Left: Itinerary Panel */}
        <div className={`h-full overflow-hidden ${mobileView === 'map' ? 'hidden md:block' : 'block'}`}>
          <ItineraryPanel
            activeDay={activeDay}
            onDayChange={setActiveDay}
            itineraryData={calculatedItinerary}
            startTime={startTimes[activeDay] || '09:00'}
            onUpdateStartTime={handleUpdateStartTime}
            onUpdateItinerary={handleUpdateItinerary}
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
            activeDay={activeDay}
            onAddLocation={handleAddLocation}
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
