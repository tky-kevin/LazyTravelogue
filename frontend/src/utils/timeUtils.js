export const recalculateDayTimeline = (items, startTimeStr) => {
    if (!items || items.length === 0) return [];

    let currentDate = new Date();
    const [hours, minutes] = startTimeStr.split(':').map(Number);
    currentDate.setHours(hours, minutes, 0, 0);

    return items.map((item, index) => {
        let start = new Date(currentDate);

        const stayMinutes = item.stayDuration || 60;
        const end = new Date(start.getTime() + stayMinutes * 60000);

        let travelSeconds = 0;
        if (item.durationValue) {
            travelSeconds = item.durationValue;
        }

        // Update global tracker for NEXT loop
        currentDate = new Date(end.getTime() + travelSeconds * 1000);

        const formatTime = (date) => {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        };

        return {
            ...item,
            calculatedStartTime: formatTime(start),
            calculatedEndTime: formatTime(end)
        };
    });
};
