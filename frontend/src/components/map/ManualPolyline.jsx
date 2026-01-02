import { useEffect, useRef } from 'react';
import { useGoogleMap } from '@react-google-maps/api';

export const ManualPolyline = ({ path, options }) => {
    const map = useGoogleMap();
    const lineRef = useRef(null);

    // Create & Cleanup
    useEffect(() => {
        if (!map) return;
        const line = new window.google.maps.Polyline({
            map,
            path,
            ...options
        });
        lineRef.current = line;

        // Force cleanup
        return () => {
            if (lineRef.current) {
                lineRef.current.setMap(null);
                lineRef.current = null;
            }
        };
    }, [map]); // Init once. Changes handled by next effect or key change remount.

    // Update options if instance preserves
    useEffect(() => {
        if (!lineRef.current) return;
        lineRef.current.setOptions(options);
        // path update is tricky if length changes, safer to rely on remount via key
        // but for safety:
        lineRef.current.setPath(path);
    }, [path, options]);

    return null;
};
