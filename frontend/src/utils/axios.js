import axios from "axios";

/**
 * Event dispatched on the window when the API rejects a request with 401,
 * so the app can return the user to the sign-in screen.
 */
export const SESSION_EXPIRED_EVENT = "nexora:session-expired";

const api = axios.create({
    baseURL: import.meta.env.VITE_SERVER_URL || "",
    withCredentials: true,
    // Generous timeout: agent requests can take minutes for long-running
    // generation work. This mirrors the Nginx proxy_read_timeout.
    timeout: 300000
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
        }
        return Promise.reject(error);
    }
);

export default api;
