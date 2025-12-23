import { format, differenceInCalendarDays, addMinutes } from 'date-fns';

export const recalculateDayTimeline = (items, startTimeStr, targetDateStr = null) => {
    if (!items || items.length === 0) return [];

    // Base Reference Date (Use targetDateStr if provided, else today)
    let baseDate = new Date();
    if (targetDateStr) {
        const parsed = new Date(targetDateStr);
        if (!isNaN(parsed.getTime())) {
            baseDate = parsed;
        }
    }
    // Ensure baseDate starts at 00:00:00 of THAT day
    baseDate.setHours(0, 0, 0, 0);

    // Initial Start Time
    const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
    let currentCursor = new Date(baseDate);
    currentCursor.setHours(startHours, startMinutes, 0, 0);

    const formatTime = (date) => {
        const timeStr = format(date, 'HH:mm');
        const dayDiff = differenceInCalendarDays(date, baseDate);
        if (dayDiff > 0) {
            return `${timeStr} (+${dayDiff})`;
        }
        return timeStr;
    };

    return items.map((item) => {
        // 1. Activity Start
        const startDate = new Date(currentCursor);

        // 2. Activity Duration
        const stayMinutes = isNaN(parseInt(item.stayDuration)) ? 60 : parseInt(item.stayDuration);
        const endDate = addMinutes(startDate, stayMinutes);

        // 3. Travel Time to Next
        const travelSeconds = item.durationValue || 0;
        // Round travel time to nearest minute to avoid "10:14:59" truncating to "10:14"
        // Using Math.round ensures 14m 50s becomes 15m, adhering to human expectation
        const travelMinutes = Math.round(travelSeconds / 60);
        const travelEndDate = addMinutes(endDate, travelMinutes);

        // Update Cursor for next item
        currentCursor = travelEndDate;

        return {
            ...item,
            startDate: startDate,
            endDate: endDate,
            travelStartDate: endDate,
            travelEndDate: travelEndDate,
            // Legacy/Display fields
            calculatedStartTime: formatTime(startDate),
            calculatedEndTime: formatTime(endDate),
            calculatedTravelEndTime: formatTime(travelEndDate)
        };
    });
};
