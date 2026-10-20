import axios from "axios"

const CHAT_SERVICE_URL = process.env.CHAT_SERVICE || "http://chat:8002"
const INTERNAL_TIMEOUT_MS = Number(process.env.INTERNAL_CALL_TIMEOUT_MS) || 10000

export const getMessages = async (conversationId) => {
    if (!conversationId) return []
    try {
        const { data } = await axios.get(`${CHAT_SERVICE_URL}/get-messages/${encodeURIComponent(conversationId)}`, {
            timeout: INTERNAL_TIMEOUT_MS
        })
        return Array.isArray(data) ? data : []
    } catch (error) {
        console.error("getMessages error:", error?.message)
        return []
    }
}
