import { useState, useCallback } from 'react';
import Navbar from './components/Navbar';
import ItineraryPanel from './components/ItineraryPanel';
import MapPanel from './components/MapPanel';
import AIAssistant from './components/AIAssistant';
import { recalculateDayTimeline } from './utils/timeUtils';

function App() {
  const [selectedLocation, setSelectedLocation] = useState(null);

  // State: Focused Location (from Itinerary Click)
  const [focusedLocation, setFocusedLocation] = useState(null);

  // State: Active Day
  const [activeDay, setActiveDay] = useState('Day 1');

  // State: Day Start Times (Default 09:00)
  const [dayStartTimes, setDayStartTimes] = useState({
    'Day 1': '09:00'
  });

  // State: Itinerary Data
  // We keep the data plain (no JSX) for better state management
  const [itineraryData, setItineraryData] = useState({
    'Day 1': [
      {
        id: 'loc-1',
        title: '起點：台北車站',
        category: '交通',
        lat: 25.0478,
        lng: 121.5170,
        transportMode: 'DRIVING',
        stayDuration: 60, // minutes
        durationValue: 0 // seconds from previous
      },
      {
        id: 'loc-2',
        title: '中正紀念堂自由廣場',
        category: '觀光',
        lat: 25.0354,
        lng: 121.5197,
        transportMode: 'WALKING',
        stayDuration: 90,
        durationValue: 0
      },
      {
        id: 'loc-3',
        title: '信義商圈逛街',
        category: '購物',
        lat: 25.0410,
        lng: 121.5652,
        transportMode: 'TRANSIT',
        stayDuration: 120,
        durationValue: 0
      },
      {
        id: 'loc-4',
        title: '鼎泰豐小籠包',
        category: '餐飲',
        lat: 25.0334, // Taipei 101 store approx
        lng: 121.5639,
        transportMode: 'DRIVING',
        stayDuration: 90,
        durationValue: 0
      },
    ]
  });

  // Effect: Recalculate whenever data or start times change
  // Note: To avoid infinite loops with useEffect setting state, 
  // we could just memoize the calculation for RENDERING, 
  // but if we want to SAVE the times, we need state.
  // For now, let's calculate on-the-fly for rendering in ItineraryPanel?
  // No, Step 9 says "Display computed Arrival/Departure times on cards". 
  // Let's wrap the setItineraryData to always recalculate.

  // Actually, better: separate "Raw Data" vs "Calculated timeline".
  // But to keep it simple, let's just make a specialized updater or recalculate in `itineraryData` state updates.
  // Let's do the latter: Modify `setItineraryData` calls to include logic? No, too messy.
  // Let's add a `useEffect` that updates `calculatedData` derived state?
  // Or just modify the data in place when updates happen.

  // Let's refine the Helper to be used in Render:
  // We will pass the RAW itineraryData to ItineraryPanel.
  // AND we will pass a `calculatedItinerary` object which is derived.

  const calculatedItinerary = {
    ...itineraryData,
    [activeDay]: recalculateDayTimeline(itineraryData[activeDay], dayStartTimes[activeDay] || '09:00')
  };


  // Action: Add Location to Active Day
  const handleAddLocation = () => {
    if (!selectedLocation) return;

    const newItem = {
      id: `loc-${Date.now()}`,
      title: selectedLocation.name,
      category: '觀光', // Default category
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      description: selectedLocation.fullAddress,
      transportMode: 'DRIVING',
      stayDuration: 60, // Default 1 hour
      durationValue: 0
    };

    setItineraryData(prev => ({
      ...prev,
      [activeDay]: [...(prev[activeDay] || []), newItem]
    }));

    // Optional: Clear selection or give feedback
    console.log(`Added ${selectedLocation.name} to ${activeDay}`);
  };

  // Action: Update Itinerary (Reorder)
  const handleUpdateItinerary = (dayId, newItems) => {
    setItineraryData(prev => ({
      ...prev,
      [dayId]: newItems
    }));
  };

  // Action: Update Transport Mode
  const handleUpdateTransportMode = (dayId, itemId, newMode) => {
    setItineraryData(prev => {
      const dayItems = prev[dayId] || [];
      const updatedItems = dayItems.map(item =>
        item.id === itemId ? { ...item, transportMode: newMode } : item
      );
      return {
        ...prev,
        [dayId]: updatedItems
      };
    });
  };

  // Action: Update Directions Info (Callback from Map)
  const handleDirectionsFetched = useCallback((dayId, fromItemId, result) => {
    // result contains { distance: {text, value}, duration: {text, value} }
    setItineraryData(prev => {
      const dayItems = prev[dayId] || [];
      // Avoid infinite loop: check if data is actually different
      const targetItem = dayItems.find(i => i.id === fromItemId);
      if (targetItem && targetItem.duration === result.duration.text && targetItem.durationValue === result.duration.value) {
        return prev;
      }

      const updatedItems = dayItems.map(item =>
        item.id === fromItemId ? {
          ...item,
          duration: result.duration.text,
          durationValue: result.duration.value, // Store numeric seconds
          distance: result.distance.text
        } : item
      );

      return {
        ...prev,
        [dayId]: updatedItems
      };
    });
  }, []);

  // Action: Update Stay Duration
  const handleUpdateStayDuration = (dayId, itemId, newDuration) => {
    setItineraryData(prev => ({
      ...prev,
      [dayId]: prev[dayId].map(item =>
        item.id === itemId ? { ...item, stayDuration: parseInt(newDuration) || 0 } : item
      )
    }));
  };

  // Action: Update Start Time
  const handleUpdateStartTime = (newTime) => {
    setDayStartTimes(prev => ({
      ...prev,
      [activeDay]: newTime
    }));
  };

  // Action: Handle Directions Error (Auto-fallback)
  const handleDirectionsError = useCallback((dayId, fromItemId, status) => {
    if (status === 'ZERO_RESULTS' || status === 'NOT_FOUND') {
      setItineraryData(prev => {
        const dayItems = prev[dayId] || [];
        const targetItem = dayItems.find(i => i.id === fromItemId);

        // If Transit fails, fallback to Walking
        if (targetItem && targetItem.transportMode === 'TRANSIT') {
          console.log(`[Auto-Fallback] Switching ${fromItemId} from TRANSIT to WALKING due to ${status}`);
          const updatedItems = dayItems.map(item =>
            item.id === fromItemId ? { ...item, transportMode: 'WALKING' } : item
          );
          return { ...prev, [dayId]: updatedItems };
        }
        return prev;
      });
    }
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar onLocationSelect={setSelectedLocation} />

      <main style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(400px, 1fr) 2fr',
        gap: '2rem',
        padding: '0 3rem 2rem 3rem',
        overflow: 'hidden'
      }}>
        {/* Left: Itinerary Panel */}
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <ItineraryPanel
            activeDay={activeDay}
            onDayChange={setActiveDay}
            itineraryData={calculatedItinerary} // Pass calculated data
            startTime={dayStartTimes[activeDay] || '09:00'}
            onUpdateStartTime={handleUpdateStartTime}
            onUpdateItinerary={handleUpdateItinerary}
            onLocationFocus={setFocusedLocation}
            onUpdateTransportMode={handleUpdateTransportMode}
            onUpdateStayDuration={handleUpdateStayDuration}
          />
        </div>

        {/* Right: Map Panel */}
        <div style={{ height: '100%', position: 'relative' }}>
          <MapPanel
            selectedLocation={selectedLocation}
            focusedLocation={focusedLocation}
            itineraryData={itineraryData}
            activeDay={activeDay}
            onAddLocation={handleAddLocation}
            onDirectionsFetched={handleDirectionsFetched}
            onDirectionsError={handleDirectionsError}
          />
        </div>
      </main>

      <AIAssistant />
    </div>
  )
}

export default App
