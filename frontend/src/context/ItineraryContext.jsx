import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import { googleLogout } from '@react-oauth/google';

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

    // Initial Load / Auth Check (Mock for now or check token)
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const userData = localStorage.getItem('user_data');
        if (token && userData) {
            setUser(JSON.parse(userData));
            fetchItineraries();
        }
    }, []);

    const login = async (googleResponse) => {
        try {
            setLoading(true);
            const res = await client.post('/auth/google', { credential: googleResponse.credential });
            const { access_token, user: userData } = res.data;

            localStorage.setItem('access_token', access_token);
            localStorage.setItem('user_data', JSON.stringify(userData));
            setUser(userData);
            await fetchItineraries();
        } catch (error) {
            console.error("Login Failed", error);
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        googleLogout();
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_data');
        setUser(null);
        setItineraries([]);
        setCurrentItinerary(null);
    };

    const fetchItineraries = useCallback(async () => {
        try {
            const res = await client.get('/api/itineraries');
            setItineraries(res.data);
            if (res.data.length > 0) {
                // Select first one by default for MVP
                setCurrentItinerary(res.data[0]);
            } else {
                // Create default if none
                createItinerary({ title: "My First Trip", days: { "Day 1": [] }, start_times: { "Day 1": "09:00" } });
                // If no itinerary, create a default one
                await createItinerary({
                    title: "My Trip",
                    // Missing dates?
                });
            }
        } catch (error) {
            console.error("Fetch Itineraries Failed", error);
        }
    }, []);

    const createItinerary = async (itineraryData = {}) => {
        try {
            const today = new Date().toISOString();
            const payload = {
                title: "My Awesome Trip",
                start_date: today,
                end_date: today,
                days: { "Day 1": [] },
                start_times: { "Day 1": "09:00" },
                ...itineraryData
            };

            const res = await client.post('/api/itineraries', payload);
            setItineraries([...itineraries, res.data]);
            setCurrentItinerary(res.data);
            return res.data;
        } catch (error) {
            console.error("Create Failed", error);
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
        }
    };

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
