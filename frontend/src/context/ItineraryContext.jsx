import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import client from '../api/client';
import { googleLogout } from '@react-oauth/google';
import toast from 'react-hot-toast';

const ItineraryContext = createContext();

export function useItinerary() {
    return useContext(ItineraryContext);
}

export function ItineraryProvider({ children }) {
    const [user, setUser] = useState(null);
    const [itineraries, setItineraries] = useState([]);
    const [currentItinerary, setCurrentItinerary] = useState(null);
    const [activeDay, setActiveDay] = useState('Day 1');
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [loading, setLoading] = useState(false);



    const login = async (googleResponse) => {
        try {
            setLoading(true);
            const res = await client.post('/auth/google', { credential: googleResponse.credential });
            // Backend sets Cookie "access_token"
            const { user: userData } = res.data;

            localStorage.setItem('user_data', JSON.stringify(userData));
            setUser(userData);
            await fetchItineraries();
            toast.success('Successfully logged in!');
        } catch (error) {
            console.error("Login Failed", error);
            toast.error('Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await client.post('/auth/logout'); // Tell backend to clear cookie
        } catch (e) { console.error("Logout error", e); }

        googleLogout();
        localStorage.removeItem('user_data');
        setUser(null);
        setItineraries([]);
        setCurrentItinerary(null);
        toast.success('Logged out');
    };

    const fetchItineraries = useCallback(async () => {
        try {
            const res = await client.get('/api/itineraries');
            setItineraries(res.data);
            if (res.data.length > 0) {
                // Select first one by default for MVP
                setCurrentItinerary(res.data[0]);
            } else {
                // Create default if none with NEW SCHEMA
                await createItinerary({
                    title: "My First Trip",
                    days: [{ id: "day-1", date: "Day 1", activities: [] }]
                });
            }
        } catch (error) {
            console.error("Fetch Itineraries Failed", error);
            toast.error('Failed to load itineraries');
        }
    }, []);

    const createItinerary = async (itineraryData = {}) => {
        try {
            const today = new Date().toISOString();
            // Default payload with NEW SCHEMA
            const payload = {
                title: "My Awesome Trip",
                start_date: today,
                end_date: today,
                days: [{ id: "day-1", date: "Day 1", activities: [] }],
                ...itineraryData
            };

            const res = await client.post('/api/itineraries', payload);
            setItineraries([...itineraries, res.data]);
            setCurrentItinerary(res.data);
            toast.success('New itinerary created');
            return res.data;
        } catch (error) {
            console.error("Create Failed", error);
            toast.error('Failed to create itinerary');
        }
    };

    const updateItinerary = async (id, updates) => {
        if (!currentItinerary) return;

        // Merge updates with current state to create full object
        const updatedItinerary = { ...currentItinerary, ...updates };

        // Optimistic Update
        setCurrentItinerary(updatedItinerary);

        try {
            // Send FULL object because PUT requires all fields
            await client.put(`/api/itineraries/${id}`, updatedItinerary);
        } catch (error) {
            console.error("Update Failed", error);
            toast.error('Failed to save changes');
            // Revert? (Not implemented for simplicity)
        }
    };

    const patchItinerary = async (id, updates) => {
        if (!currentItinerary) return;

        // Optimistic Update locally
        // We need to carefully merge "updates" into currentItinerary
        // Since "updates" might be { days: [...] } or { title: "..." }
        const updatedItinerary = { ...currentItinerary, ...updates };
        setCurrentItinerary(updatedItinerary);

        try {
            await client.patch(`/api/itineraries/${id}`, updates);
        } catch (error) {
            console.error("Patch Failed", error);
            toast.error('Failed to save changes (Partial)');
        }
    };

    // Initial Load / Auth Check
    // Use a ref to track if we've already started fetching to prevent strict mode double-tap
    const initialFetchDone = useRef(false);

    useEffect(() => {
        const userData = localStorage.getItem('user_data');
        if (userData && !initialFetchDone.current) {
            initialFetchDone.current = true;
            setUser(JSON.parse(userData));
            fetchItineraries();
        }
    }, [fetchItineraries]);

    const value = {
        user,
        itineraries,
        currentItinerary,
        loading,
        activeDay,
        selectedLocation,
        login,
        logout,
        createItinerary,
        updateItinerary,
        patchItinerary,
        setCurrentItinerary,
        setActiveDay,
        setSelectedLocation
    };

    return (
        <ItineraryContext.Provider value={value}>
            {children}
        </ItineraryContext.Provider>
    );
}
