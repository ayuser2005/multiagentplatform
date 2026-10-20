import api from "../utils/axios"

/**
 * Fetch the currently authenticated user.
 * Returns `null` when there is no valid session.
 */
const getCurrentUser = async () => {
    try {
        const { data } = await api.get("/api/me")
        return data || null
    } catch (error) {
        // A 401 simply means "not signed in" - not an error worth surfacing.
        if (error?.response?.status !== 401) {
            console.error("getCurrentUser failed:", error?.message)
        }
        return null
    }
}

export default getCurrentUser
