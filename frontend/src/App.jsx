import { useState, useMemo, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Map, List, Sparkles } from 'lucide-react';
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
    handleRemoveItem,
    handleAddToPocket,
    handleMoveFromPocketToDay
  } = useItineraryActions();

  const [focusedLocation, setFocusedLocation] = useState(null);
  const [mobileView, setMobileView] = useState('list');

  const daysData = useMemo(() => {
    if (!currentItinerary?.days) return { "Day 1": [] };

    const map = {};
    if (Array.isArray(currentItinerary.days)) {
      currentItinerary.days.forEach(d => {
        map[d.id] = d.activities || [];
        if (d.date) map[d.date] = d.activities || [];
      });
    } else {
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

  const calculatedItinerary = useMemo(() => {
    const currentActivities = daysData[activeDay] || [];
    const startTime = startTimes[activeDay] || '09:00';

    return {
      ...daysData,
      [activeDay]: recalculateDayTimeline(currentActivities, startTime, activeDayLabel)
    };
  }, [daysData, startTimes, activeDay, activeDayLabel]);

  useEffect(() => {
    if (selectedLocation) {
      setMobileView('map');
    }
  }, [selectedLocation]);
  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
        <Toaster position="top-center" />
        <h1 className="text-4xl font-serif font-bold text-gray-800 mb-8">LazyTravelogue</h1>
        <div className="p-8 bg-white rounded-xl shadow-lg text-center">
          <p className="text-gray-600 mb-4">Please sign in to continue</p>
          <GoogleLogin
            onSuccess={login}
            onError={() => { }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col font-sans text-gray-900">
      <Toaster position="top-right" />
      <Navbar
        onLocationSelect={(loc) => {
          setSelectedLocation(loc);
        }}
        pocketList={currentItinerary?.pocket_list || []}
        onMoveFromPocket={handleMoveFromPocketToDay}
        onRemoveItem={handleRemoveItem}
        activeDay={activeDay}
        activeDayLabel={activeDayLabel}
      />

      <main className="flex-1 grid grid-cols-1 md:grid-cols-[minmax(400px,450px)_1fr] lg:grid-cols-[minmax(450px,500px)_1fr] gap-0 md:gap-8 px-0 md:px-8 lg:px-12 pt-2 md:pt-4 pb-20 md:pb-8 overflow-hidden relative">
        {/* Left: Itinerary Panel */}
        <div className={`h-full overflow-hidden ${mobileView === 'list' ? 'block' : 'hidden md:block'}`}>
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
            pocketList={currentItinerary?.pocket_list || []}
            onMoveFromPocket={handleMoveFromPocketToDay}
            itineraryId={currentItinerary?.id || currentItinerary?._id}
          />
        </div>

        {/* Right: Map Panel / AI Panel (Mobile Only) */}
        <div className={`h-full relative ${mobileView === 'list' ? 'hidden md:block' : 'block'}`}>
          {mobileView === 'ai' ? (
            <div className="md:hidden h-full">
              <AIAssistant inline />
            </div>
          ) : (
            <MapPanel
              selectedLocation={selectedLocation}
              focusedLocation={focusedLocation}
              itineraryData={calculatedItinerary}
              days={currentItinerary?.days || []}
              activeDay={activeDay}
              activeDayLabel={activeDayLabel}
              onLocationSelect={setSelectedLocation}
              onAddLocation={() => handleAddLocation(setMobileView)}
              onAddToPocket={handleAddToPocket}
              onDirectionsFetched={handleDirectionsFetched}
              onDirectionsError={handleDirectionsError}
            />
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-ink-border z-50 flex justify-around items-center py-2 px-6 safe-area-pb">
          <button
            onClick={() => setMobileView('list')}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${mobileView === 'list' ? 'text-primary' : 'text-ink-muted'}`}
          >
            <List size={22} className={mobileView === 'list' ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold">行程</span>
          </button>
          <button
            onClick={() => setMobileView('map')}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${mobileView === 'map' ? 'text-primary' : 'text-ink-muted'}`}
          >
            <Map size={22} className={mobileView === 'map' ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold">地圖</span>
          </button>
          <button
            onClick={() => setMobileView('ai')}
            className={`flex flex-col items-center gap-1 p-2 transition-colors ${mobileView === 'ai' ? 'text-primary' : 'text-ink-muted'}`}
          >
            <Sparkles size={22} className={mobileView === 'ai' ? 'scale-110' : ''} />
            <span className="text-[10px] font-bold">助手</span>
          </button>
        </div>
      </main>

      {/* Desktop Floating Assistant */}
      <AIAssistant />
    </div>
  );
}

export default App;
