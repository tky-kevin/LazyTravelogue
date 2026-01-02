
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

    // 6. TSP Solver (Nearest Neighbor Heuristic) - Fixed Start AND End
    // FIRST item (index 0) = fixed START, LAST item (index n-1) = fixed END
    const n = items.length;
    const startNode = 0;
    const endNode = n - 1;

    // Middle nodes to visit (exclude start and end)
    const toVisit = new Set(
        Array.from({ length: n }, (_, i) => i).filter(i => i !== startNode && i !== endNode)
    );

    let current = startNode;
    const path = [startNode];

    // Nearest Neighbor with end-point awareness
    while (toVisit.size > 0) {
        let bestNext = -1;
        let minDuration = Infinity;

        for (const candidate of toVisit) {
            // Consider both: distance to candidate AND remaining distance to end
            const durationToCandidate = costMatrix[current][candidate];

            // Heuristic: penalize choices that move us far from the endpoint
            // This helps avoid the "trapped far from end" problem
            const remainingToEnd = costMatrix[candidate][endNode];
            const heuristicCost = durationToCandidate + remainingToEnd * 0.1; // Small weight for lookahead

            if (heuristicCost < minDuration) {
                minDuration = heuristicCost;
                bestNext = candidate;
            }
        }

        if (bestNext !== -1) {
            path.push(bestNext);
            toVisit.delete(bestNext);
            current = bestNext;
        } else {
            // Fallback: pick any remaining node
            const next = toVisit.values().next().value;
            path.push(next);
            toVisit.delete(next);
            current = next;
        }
    }

    // Append the fixed end node
    path.push(endNode);

    // 7. 2-opt Local Search Optimization (respecting fixed start and end)
    // Only optimizes the middle portion of the route
    const twoOptImprove = (route, matrix) => {
        const len = route.length;
        let improved = true;

        while (improved) {
            improved = false;

            // Only consider middle nodes: indices 1 to len-2
            // Keep index 0 (start) and index len-1 (end) fixed
            for (let i = 1; i < len - 2; i++) {
                for (let j = i + 1; j < len - 1; j++) {
                    // Calculate current cost for edges: (i-1 → i) and (j → j+1)
                    const a = route[i - 1];
                    const b = route[i];
                    const c = route[j];
                    const d = route[j + 1];

                    // Current cost: a→b + c→d
                    // New cost after reversing [i...j]: a→c + b→d
                    const currentCost = matrix[a][b] + matrix[c][d];
                    const newCost = matrix[a][c] + matrix[b][d];

                    // If reversing this segment reduces total distance, do it
                    if (newCost < currentCost) {
                        // Reverse the segment from i to j (inclusive)
                        const reversed = route.slice(i, j + 1).reverse();
                        for (let k = 0; k < reversed.length; k++) {
                            route[i + k] = reversed[k];
                        }
                        improved = true;
                    }
                }
            }
        }

        return route;
    };

    // Apply 2-opt optimization to the path
    const optimizedPath = twoOptImprove([...path], costMatrix);

    // 8. Map back to items
    return optimizedPath.map(index => items[index]);
};
