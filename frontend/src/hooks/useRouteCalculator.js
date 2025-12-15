import { useRef, useCallback } from 'react';

export function useRouteCalculator() {
    // Cache structure: { "key": Promise<Result> }
    // We cache Promises to handle concurrent requests for same route
    const requestCache = useRef({});
    // Data cache for instant sync access if needed (optional, promises cover it) but good for persistence
    const dataCache = useRef({});

    const getRoute = useCallback((origin, destination, mode) => {
        if (!window.google || !window.google.maps) {
            return Promise.reject("Google Maps API not loaded");
        }

        const cacheKey = `${origin.lat},${origin.lng}-${destination.lat},${destination.lng}-${mode}`;

        // Return cached result if available
        if (dataCache.current[cacheKey]) {
            return Promise.resolve(dataCache.current[cacheKey]);
        }

        // Return in-flight promise if available
        if (requestCache.current[cacheKey]) {
            return requestCache.current[cacheKey];
        }

        // Create new request
        const service = new window.google.maps.DirectionsService();

        const requestPromise = new Promise((resolve, reject) => {
            service.route(
                {
                    origin: { lat: parseFloat(origin.lat), lng: parseFloat(origin.lng) },
                    destination: { lat: parseFloat(destination.lat), lng: parseFloat(destination.lng) },
                    travelMode: mode === 'TRANSIT' ? window.google.maps.TravelMode.TRANSIT :
                        mode === 'WALKING' ? window.google.maps.TravelMode.WALKING :
                            window.google.maps.TravelMode.DRIVING,
                    transitOptions: mode === 'TRANSIT' ? {
                        routingPreference: window.google.maps.TransitRoutePreference.FEWER_TRANSFERS
                    } : undefined
                },
                (result, status) => {
                    if (status === window.google.maps.DirectionsStatus.OK) {
                        dataCache.current[cacheKey] = result;
                        resolve(result);
                    } else {
                        // Don't cache errors forever, but for now we remove from request cache so it can be retried
                        delete requestCache.current[cacheKey];
                        reject(status);
                    }
                }
            );
        });

        requestCache.current[cacheKey] = requestPromise;
        return requestPromise;

    }, []);

    return { getRoute };
}
