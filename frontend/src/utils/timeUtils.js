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
    baseDate.setHours(0, 0, 0, 0);

    const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
    let currentCursor = new Date(baseDate);
    currentCursor.setHours(startHours, startMinutes, 0, 0);

    const formatTime = (date) => {
        const timeStr = format(date, 'HH:mm');
        const dayDiff = differenceInCalendarDays(date, baseDate);
        return dayDiff > 0 ? `${timeStr} (+${dayDiff})` : timeStr;
    };

    return items.map((item) => {
        const startDate = new Date(currentCursor);
        const stayMinutes = isNaN(parseInt(item.stayDuration)) ? 60 : parseInt(item.stayDuration);
        const endDate = addMinutes(startDate, stayMinutes);

        // Round travel seconds to the nearest minute for consistent UI display
        const travelSeconds = item.durationValue || 0;
        const travelMinutes = Math.round(travelSeconds / 60);
        const travelEndDate = addMinutes(endDate, travelMinutes);

        currentCursor = travelEndDate;

        return {
            ...item,
            startDate: startDate,
            endDate: endDate,
            travelStartDate: endDate,
            travelEndDate: travelEndDate,
            calculatedStartTime: formatTime(startDate),
            calculatedEndTime: formatTime(endDate),
            calculatedTravelEndTime: formatTime(travelEndDate)
        };
    });
};
