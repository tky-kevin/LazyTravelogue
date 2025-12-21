import axios from 'axios';

const API_URL = import.meta.env.DEV ? 'http://localhost:8000' : (import.meta.env.VITE_API_URL || 'http://localhost:8000');

const client = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Enable sending cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach Token if available (Fix for Incognito/Cross-Site)
client.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response Interceptor: Handle 401 (Logout)
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('user_data');
            // Optional: Redirect to login or trigger context logout
            // window.location.href = '/'; 
        }
        return Promise.reject(error);
    }
);

export default client;
