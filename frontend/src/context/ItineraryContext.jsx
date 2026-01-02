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
    const [showPocket, setShowPocket] = useState(false);

    const createItinerary = useCallback(async (itineraryData = {}) => {
        try {
            const today = new Date().toISOString();
            const payload = {
                title: "我的旅行",
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
            toast.success('已建立新行程');
            return res.data;
        } catch (error) {
            console.error("Create Failed", error);
            toast.error('建立行程失敗');
        }
    }, [itineraries.length]);

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
                    title: "我的第一次旅行",
                    days: [{ id: "day-1", date: "Day 1", activities: [] }]
                });
            }
        } catch (error) {
            console.error("Fetch Itineraries Failed", error);
            toast.error('讀取行程失敗');
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
            toast.success('登入成功！');
        } catch (error) {
            console.error("Login Failed", error);
            toast.error('登入失敗，請重試。');
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
        toast.success('已登出');
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
            toast.error('儲存失敗');
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
            toast.error('部分儲存失敗');
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
                        title: "我的第一次旅行",
                        days: [{ id: "day-1", date: "Day 1", activities: [] }]
                    });
                }
            }
            toast.success('行程已刪除');
        } catch (error) {
            console.error("Delete Failed", error);
            toast.error('刪除行程失敗');
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
            toast.success('AI 行程已匯入！');
        } catch (error) {
            console.error("Replace Failed", error);
            toast.error('匯入行程失敗');
        }
    };

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
        setSelectedLocation,
        showPocket,
        setShowPocket
    };

    return (
        <ItineraryContext.Provider value={value}>
            {children}
        </ItineraryContext.Provider>
    );
}
