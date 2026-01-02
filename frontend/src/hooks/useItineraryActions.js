import { useState, useCallback } from 'react';
import { useItinerary } from '../context/ItineraryContext';
import toast from 'react-hot-toast';

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


        if (mobileViewSetter) mobileViewSetter('list');
    };

    const handleAddToPocket = () => {
        if (!selectedLocation || !currentItinerary) return;

        const newItem = {
            id: `pocket-${Date.now()}`,
            title: selectedLocation.name,
            category: selectedLocation.category || '景點',
            lat: selectedLocation.lat,
            lng: selectedLocation.lng,
            description: selectedLocation.fullAddress,
            transportMode: 'DRIVING',
            stayDuration: 60,
            durationValue: 0
        };

        const updatedPocket = [...(currentItinerary.pocket_list || []), newItem];
        const updatePayload = { pocket_list: updatedPocket };

        if (patchItinerary) {
            patchItinerary(currentItinerary._id || currentItinerary.id, updatePayload);
        } else {
            updateItinerary(currentItinerary._id || currentItinerary.id, updatePayload);
        }

        toast.success(`已加入口袋名單: ${selectedLocation.name}`);
        setSelectedLocation(null);
    };

    const handleUpdateItinerary = (dayId, newItems, overridePayload = null) => {
        if (!currentItinerary) return;

        // If explicitly updating root properties (like title)
        if (overridePayload) {
            if (patchItinerary) patchItinerary(currentItinerary._id || currentItinerary.id, overridePayload);
            else updateItinerary(currentItinerary._id || currentItinerary.id, overridePayload);
            return;
        }

        if (!Array.isArray(currentItinerary.days)) return;

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

        const currentTransitDetails = targetItem?.transitDetails || [];
        const currentAlternatives = targetItem?.alternatives || [];
        const nextTransitDetails = result.transitDetails || [];
        const nextAlternatives = result.alternatives || [];

        const dataChanged = !targetItem ||
            targetItem.duration !== result.duration.text ||
            targetItem.durationValue !== result.duration.value ||
            JSON.stringify(currentTransitDetails) !== JSON.stringify(nextTransitDetails) ||
            JSON.stringify(currentAlternatives) !== JSON.stringify(nextAlternatives);

        if (!dataChanged) return;

        const updatedItems = currentItems.map(item =>
            item.id === fromItemId ? {
                ...item,
                duration: result.duration.text,
                durationValue: result.duration.value,
                distance: result.distance.text,
                transitDetails: nextTransitDetails,
                alternatives: nextAlternatives
            } : item
        );

        handleUpdateItinerary(dayId, updatedItems);
    }, [currentItinerary, patchItinerary, updateItinerary, getDayItems]);

    const handleUpdateDateRange = useCallback((newStartDate, newEndDate) => {
        if (!currentItinerary) return;

        const dayCount = Math.ceil((newEndDate - newStartDate) / (1000 * 60 * 60 * 24)) + 1;
        const currentDays = currentItinerary.days || [];

        const newDays = Array.from({ length: dayCount }, (_, i) => {
            if (i < currentDays.length) {
                const existing = currentDays[i];
                return {
                    ...existing,
                    date: `Day ${i + 1}`
                };
            } else {
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

    const handleDirectionsError = useCallback(() => { }, []);

    const handleReorderDays = useCallback((newDayOrder) => {
        if (!currentItinerary?.days) return;

        const currentDays = currentItinerary.days;
        const reorderedDays = newDayOrder.map((originalId, index) => {
            const originalDay = currentDays.find(d => d.id === originalId || d.date === originalId);
            if (!originalDay) return null;

            return {
                ...originalDay,
                date: `Day ${index + 1}`
            };
        }).filter(Boolean);

        const payload = { days: reorderedDays };

        if (patchItinerary) patchItinerary(currentItinerary._id || currentItinerary.id, payload);
        else updateItinerary(currentItinerary._id || currentItinerary.id, payload);

    }, [currentItinerary, patchItinerary, updateItinerary]);

    const handleMoveFromPocketToDay = useCallback((dayId, item) => {
        if (!currentItinerary) return;

        const currentDays = currentItinerary.days || [];
        const newItem = { ...item, id: `loc-${Date.now()}` };
        const updatedDays = currentDays.map(day => {
            if (day.id === dayId || day.date === dayId) {
                return { ...day, activities: [...(day.activities || []), newItem] };
            }
            return day;
        });

        const updatedPocket = (currentItinerary.pocket_list || []).filter(i => i.id !== item.id);

        const payload = {
            days: updatedDays,
            pocket_list: updatedPocket
        };

        if (patchItinerary) patchItinerary(currentItinerary._id || currentItinerary.id, payload);
        else updateItinerary(currentItinerary._id || currentItinerary.id, payload);
    }, [currentItinerary, patchItinerary, updateItinerary]);

    const handleRemoveItem = useCallback((dayId, itemId) => {
        if (!currentItinerary) return;

        if (dayId === 'pocket') {
            const updatedPocket = (currentItinerary.pocket_list || []).filter(item => item.id !== itemId);
            const payload = { pocket_list: updatedPocket };
            if (patchItinerary) patchItinerary(currentItinerary._id || currentItinerary.id, payload);
            else updateItinerary(currentItinerary._id || currentItinerary.id, payload);
            return;
        }

        const currentItems = getDayItems(dayId);
        const updatedItems = currentItems.filter(item => item.id !== itemId);
        handleUpdateItinerary(dayId, updatedItems);
    }, [currentItinerary, handleUpdateItinerary, patchItinerary, updateItinerary]);

    return {
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
    };
}
