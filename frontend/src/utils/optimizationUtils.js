
export const optimizeRoute = async (items) => {
    if (!items || items.length <= 2) return items; // Need at least 3 items to meaningfully reorder (Start -> A -> B vs Start -> B -> A)

    // 1. Prepare Locations
    const locations = items.map(item => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lng)
    }));

    // 2. Determine Mode (Majority vote or default Driving)
    const modes = items.map(i => i.transportMode || 'DRIVING');
    const modeCounts = modes.reduce((acc, curr) => {
        acc[curr] = (acc[curr] || 0) + 1;
        return acc;
    }, {});
    const bestMode = Object.keys(modeCounts).reduce((a, b) => modeCounts[a] > modeCounts[b] ? a : b);

    // 3. Check Google Maps API
    if (!window.google || !window.google.maps) {
        throw new Error("Google Maps API is not loaded yet.");
    }

    // 4. Fetch Distance Matrix
    // Note: JS API Limit is 25 origins/destinations. 
    // For a day trip, usually < 15 stops, so OK.
    const service = new window.google.maps.DistanceMatrixService();

    // Map our 'bestMode' string to Google constants
    let travelMode = window.google.maps.TravelMode.DRIVING;
    if (bestMode === 'TRANSIT') travelMode = window.google.maps.TravelMode.TRANSIT;
    if (bestMode === 'WALKING') travelMode = window.google.maps.TravelMode.WALKING;

    const response = await new Promise((resolve, reject) => {
        service.getDistanceMatrix({
            origins: locations,
            destinations: locations,
            travelMode: travelMode,
        }, (response, status) => {
            if (status === 'OK') resolve(response);
            else reject(status);
        });
    });

    if (!response || !response.rows) {
        throw new Error("Failed to retrieve distance matrix");
    }

    // 5. Build Cost Matrix (Duration in seconds)
    const costMatrix = response.rows.map(row =>
        row.elements.map(element => {
            if (element.status !== 'OK') return Infinity;
            return element.duration.value;
        })
    );

    // 6. TSP Solver (Nearest Neighbor Heuristic)
    // We assume the FIRST item (index 0) is the fixed START point (e.g. Hotel).
    const indices = Array.from({ length: items.length }, (_, i) => i);
    const startNode = 0;
    const toVisit = new Set(indices.filter(i => i !== startNode));

    let current = startNode;
    const path = [startNode];

    while (toVisit.size > 0) {
        let bestNext = -1;
        let minDuration = Infinity;

        for (const candidate of toVisit) {
            const duration = costMatrix[current][candidate];
            // If disconnected, duration is Infinity
            if (duration < minDuration) {
                minDuration = duration;
                bestNext = candidate;
            }
        }

        if (bestNext !== -1) {
            path.push(bestNext);
            toVisit.delete(bestNext);
            current = bestNext;
        } else {
            // Disconnected graph or remaining nodes unreachable
            // Just pick the next available one arbitrarily to ensure all are visited
            const next = toVisit.values().next().value;
            path.push(next);
            toVisit.delete(next);
            current = next;
        }
    }

    // 7. Map back to items
    return path.map(index => items[index]);
};
