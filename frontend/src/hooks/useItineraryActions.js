import { useState, useCallback } from 'react';
import { useItinerary } from '../context/ItineraryContext';

export function useItineraryActions() {
    const {
        currentItinerary,
        updateItinerary,
        patchItinerary, // We will add this to Context
        activeDay,
        selectedLocation,
        setSelectedLocation
    } = useItinerary();

    // Simplified logic assuming consistent List[Day] structure from backend.

    const getDayItems = (dayId) => {
        if (!currentItinerary?.days || !Array.isArray(currentItinerary.days)) return [];
        const day = currentItinerary.days.find(d => d.id === dayId || d.date === dayId);
        return day ? day.activities : [];
    };

    const handleAddLocation = (mobileViewSetter) => {
        if (!selectedLocation || !currentItinerary) return;

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

        if (Array.isArray(currentItinerary.days)) {
            const updatedDays = currentItinerary.days.map(day => {
                // Match by ID or Date (legacy/activeDay fallback)
                if (day.id === activeDay || day.date === activeDay) {
                    return { ...day, activities: [...(day.activities || []), newItem] };
                }
                return day;
            });
            const updatePayload = { days: updatedDays };

            // Use patch if available, else update
            if (patchItinerary) {
                patchItinerary(currentItinerary._id || currentItinerary.id, updatePayload);
            } else {
                updateItinerary(currentItinerary._id || currentItinerary.id, updatePayload);
            }
        }

        console.log(`Added ${selectedLocation.name} to ${activeDay}`);
        if (mobileViewSetter) mobileViewSetter('list');
    };

    const handleUpdateItinerary = (dayId, newItems) => {
        if (!currentItinerary || !Array.isArray(currentItinerary.days)) return;

        const updatedDays = currentItinerary.days.map(day => {
            if (day.id === dayId || day.date === dayId) {
                return { ...day, activities: newItems };
            }
            return day;
        });

        const updatePayload = { days: updatedDays };

        if (patchItinerary) patchItinerary(currentItinerary._id || currentItinerary.id, updatePayload);
        else updateItinerary(currentItinerary._id || currentItinerary.id, updatePayload);
    };

    const handleUpdateTransportMode = (dayId, itemId, newMode) => {
        if (!currentItinerary) return;
        const currentItems = getDayItems(dayId);
        const updatedItems = currentItems.map(item =>
            item.id === itemId ? { ...item, transportMode: newMode } : item
        );
        handleUpdateItinerary(dayId, updatedItems);
    };

    const handleUpdateStayDuration = (dayId, itemId, newDuration) => {
        if (!currentItinerary) return;
        const currentItems = getDayItems(dayId);
        const updatedItems = currentItems.map(item =>
            item.id === itemId ? { ...item, stayDuration: parseInt(newDuration) || 0 } : item
        );
        handleUpdateItinerary(dayId, updatedItems);
    };

    const handleUpdateStartTime = (newTime) => {
        if (!currentItinerary) return;
        // Start time logic might need adaptation for new schema if we moved start_time to Day model
        // For now assume it is still in start_times dict or adapted

        // If we want to use PATCH:
        const payload = {
            start_times: {
                ...currentItinerary.start_times,
                [activeDay]: newTime
            }
        };

        if (patchItinerary) patchItinerary(currentItinerary._id || currentItinerary.id, payload);
        else updateItinerary(currentItinerary._id || currentItinerary.id, payload);
    };

    const handleDirectionsFetched = useCallback((dayId, fromItemId, result) => {
        if (!currentItinerary) return;

        const currentItems = getDayItems(dayId);
        const targetItem = currentItems.find(i => i.id === fromItemId);

        if (targetItem && targetItem.duration === result.duration.text && targetItem.durationValue === result.duration.value) {
            return;
        }

        const updatedItems = currentItems.map(item =>
            item.id === fromItemId ? {
                ...item,
                duration: result.duration.text,
                durationValue: result.duration.value,
                distance: result.distance.text
            } : item
        );

        handleUpdateItinerary(dayId, updatedItems);
    }, [currentItinerary, patchItinerary, updateItinerary]); // Dependencies

    const handleDirectionsError = useCallback((dayId, fromItemId, status) => {
        if (!currentItinerary) return;

        if (status === 'ZERO_RESULTS' || status === 'NOT_FOUND') {
            const currentItems = getDayItems(dayId);
            const targetItem = currentItems.find(i => i.id === fromItemId);

            if (targetItem && targetItem.transportMode === 'TRANSIT') {
                const updatedItems = currentItems.map(item =>
                    item.id === fromItemId ? { ...item, transportMode: 'WALKING' } : item
                );
                handleUpdateItinerary(dayId, updatedItems);
            }
        }
    }, [currentItinerary, patchItinerary, updateItinerary]);

    return {
        handleAddLocation,
        handleUpdateItinerary,
        handleUpdateTransportMode,
        handleUpdateStayDuration,
        handleUpdateStartTime,
        handleDirectionsFetched,
        handleDirectionsError
    };
}
