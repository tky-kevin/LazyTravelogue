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

    const handleUpdateDateRange = useCallback((newStartDate, newEndDate) => {
        if (!currentItinerary) return;

        // Calculate days difference
        const dayCount = Math.ceil((newEndDate - newStartDate) / (1000 * 60 * 60 * 24)) + 1;
        const currentDays = currentItinerary.days || [];

        // Create new Days array
        // We preserve existing days up to the new count.
        // If we have fewer days than before, they are truncated (activities lost for those days).
        // If we have more, we append empty days.

        const newDays = Array.from({ length: dayCount }, (_, i) => {
            if (i < currentDays.length) {
                // Keep existing day data (activities & id)
                // We might want to update the 'date' field if it stores "Day X" or actual date string
                // Based on models.py, 'date' is string. Let's ensure it stays consistent.
                const existing = currentDays[i];
                return {
                    ...existing,
                    date: `Day ${i + 1}` // Enforce Day X format consistency
                };
            } else {
                // New Day
                return {
                    id: `day-${Date.now()}-${i}`,
                    date: `Day ${i + 1}`,
                    activities: []
                };
            }
        });

        const payload = {
            start_date: newStartDate.toISOString(),
            end_date: newEndDate.toISOString(),
            days: newDays
        };

        if (patchItinerary) patchItinerary(currentItinerary._id || currentItinerary.id, payload);
        else updateItinerary(currentItinerary._id || currentItinerary.id, payload);

    }, [currentItinerary, patchItinerary, updateItinerary]);

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
                handleUpdateItinerary(dayId, updatedItems);
            }
        }
    }, [currentItinerary, patchItinerary, updateItinerary]);

    const handleReorderDays = useCallback((newDayOrder) => {
        // newDayOrder is an array of IDs/Keys like ["Day 2", "Day 1", "Day 3"]
        // corresponding to the desired order of content.

        if (!currentItinerary || !currentItinerary.days) return;

        const currentDays = currentItinerary.days;

        // Construct new days array based on the visual order
        const reorderedDays = newDayOrder.map((originalId, index) => {
            // Find the original day object that was moved to this position
            const originalDay = currentDays.find(d => d.id === originalId || d.date === originalId);

            if (!originalDay) return null;

            // Important: We aren't just moving the object, we are renaming it to the new position.
            // e.g. The day object from "Day 2" is moved to index 0. It must become "Day 1".
            return {
                ...originalDay,
                date: `Day ${index + 1}` // Reset the date/label to match the new index
            };
        }).filter(Boolean); // Safety filter

        const payload = { days: reorderedDays };

        if (patchItinerary) patchItinerary(currentItinerary._id || currentItinerary.id, payload);
        else updateItinerary(currentItinerary._id || currentItinerary.id, payload);

    }, [currentItinerary, patchItinerary, updateItinerary]);

    const handleRemoveItem = useCallback((dayId, itemId) => {
        if (!currentItinerary) return;
        const currentItems = getDayItems(dayId);
        const updatedItems = currentItems.filter(item => item.id !== itemId);
        handleUpdateItinerary(dayId, updatedItems);
    }, [currentItinerary, handleUpdateItinerary]);

    return {
        handleAddLocation,
        handleUpdateItinerary,
        handleUpdateTransportMode,
        handleUpdateStayDuration,
        handleUpdateStartTime,
        handleUpdateDateRange,
        handleDirectionsFetched,
        handleDirectionsError,
        handleDirectionsError,
        handleReorderDays,
        handleRemoveItem
    };
}
