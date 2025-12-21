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
    const [activeDay, setActiveDay] = useState(null);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [loading, setLoading] = useState(false);

    // 1. Definition Phase (Functions)

    const createItinerary = useCallback(async (itineraryData = {}) => {
        try {
            const today = new Date().toISOString();
            const payload = {
                title: "My Awesome Trip",
                start_date: today,
                end_date: today,
                days: [{ id: "day-1", date: "Day 1", activities: [] }],
                ...itineraryData
            };

            const res = await client.post('/api/itineraries', payload);
            setItineraries(prev => [...prev, res.data]);
            setCurrentItinerary(res.data);
            if (res.data.days && res.data.days.length > 0) {
                setActiveDay(res.data.days[0].id);
            }
            toast.success('New itinerary created');
            return res.data;
        } catch (error) {
            console.error("Create Failed", error);
            toast.error('Failed to create itinerary');
        }
    }, [itineraries.length]); // Dependencies if needed

    const fetchItineraries = useCallback(async () => {
        try {
            const res = await client.get('/api/itineraries');
            setItineraries(res.data);
            if (res.data.length > 0) {
                const firstItinerary = res.data[0];
                setCurrentItinerary(firstItinerary);
                if (firstItinerary.days && firstItinerary.days.length > 0) {
                    setActiveDay(firstItinerary.days[0].id);
                }
            } else {
                await createItinerary({
                    title: "My First Trip",
                    days: [{ id: "day-1", date: "Day 1", activities: [] }]
                });
            }
        } catch (error) {
            console.error("Fetch Itineraries Failed", error);
            toast.error('Failed to load itineraries');
        }
    }, [createItinerary]);

    const login = async (googleResponse) => {
        try {
            setLoading(true);
            const res = await client.post('/auth/google', { credential: googleResponse.credential });
            const { user: userData, access_token } = res.data;

            if (access_token) {
                localStorage.setItem('access_token', access_token);
            }
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
            await client.post('/auth/logout');
        } catch (e) { console.error("Logout error", e); }

        googleLogout();
        localStorage.removeItem('user_data');
        localStorage.removeItem('access_token');
        setUser(null);
        setItineraries([]);
        setCurrentItinerary(null);
        toast.success('Logged out');
    };

    const updateItinerary = async (id, updates) => {
        if (!currentItinerary) return;
        const updatedItinerary = { ...currentItinerary, ...updates };
        setCurrentItinerary(updatedItinerary);
        setItineraries(prev => prev.map(it => (it._id || it.id) === id ? updatedItinerary : it));

        try {
            await client.put(`/api/itineraries/${id}`, updatedItinerary);
        } catch (error) {
            console.error("Update Failed", error);
            toast.error('Failed to save changes');
        }
    };

    const patchItinerary = async (id, updates) => {
        if (!currentItinerary) return;
        const updatedItinerary = { ...currentItinerary, ...updates };
        setCurrentItinerary(updatedItinerary);
        setItineraries(prev => prev.map(it => (it._id || it.id) === id ? updatedItinerary : it));

        try {
            await client.patch(`/api/itineraries/${id}`, updates);
        } catch (error) {
            console.error("Patch Failed", error);
            toast.error('Failed to save changes (Partial)');
        }
    };

    const deleteItinerary = async (id) => {
        try {
            await client.delete(`/api/itineraries/${id}`);
            const updatedList = itineraries.filter(it => (it._id || it.id) !== id);
            setItineraries(updatedList);

            if (currentItinerary && (currentItinerary._id || currentItinerary.id) === id) {
                if (updatedList.length > 0) {
                    setCurrentItinerary(updatedList[0]);
                } else {
                    await createItinerary({
                        title: "My First Trip",
                        days: [{ id: "day-1", date: "Day 1", activities: [] }]
                    });
                }
            }
            toast.success('Itinerary deleted');
        } catch (error) {
            console.error("Delete Failed", error);
            toast.error('Failed to delete itinerary');
        }
    };

    const replaceItinerary = async (newData) => {
        if (!currentItinerary) return;
        const id = currentItinerary._id || currentItinerary.id;
        const planDaysCount = newData.days?.length || 1;
        const startDate = currentItinerary.start_date
            ? new Date(currentItinerary.start_date)
            : new Date();

        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + planDaysCount - 1);

        try {
            const updatePayload = {
                ...newData,
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                user_id: user?.email
            };

            const res = await client.put(`/api/itineraries/${id}`, updatePayload);
            setCurrentItinerary(res.data);
            setItineraries(prev => prev.map(it => (it._id || it.id) === id ? res.data : it));

            if (res.data.days && res.data.days.length > 0) {
                setActiveDay(res.data.days[0].id);
            }
            toast.success('Itinerary replaced with AI plan');
        } catch (error) {
            console.error("Replace Failed", error);
            toast.error('Failed to import plan');
        }
    };

    // 2. Lifecycle Phase (Hooks)

    const initialFetchDone = useRef(false);
    useEffect(() => {
        const userData = localStorage.getItem('user_data');
        if (userData && !initialFetchDone.current) {
            initialFetchDone.current = true;
            setUser(JSON.parse(userData));
            fetchItineraries();
        }
    }, [fetchItineraries]);

    useEffect(() => {
        if (currentItinerary) {
            if (currentItinerary.days && currentItinerary.days.length > 0) {
                // Only sync activeDay if it's currently null or not in the new itinerary
                const dayExists = currentItinerary.days.some(d => d.id === activeDay);
                if (!activeDay || !dayExists) {
                    setActiveDay(currentItinerary.days[0].id);
                }
            }
        }
    }, [currentItinerary?._id, currentItinerary?.id]);

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
        deleteItinerary,
        replaceItinerary,
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
