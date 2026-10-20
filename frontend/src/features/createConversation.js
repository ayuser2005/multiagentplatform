import api from "../utils/axios"

/**
 * Create a new conversation.
 *
 * Returns `null` on failure so the caller can abort the send flow instead of
 * continuing with an invalid conversation id.
 */
export const createConversation = async () => {
    try {
        const { data } = await api.get("/api/chat/create-conversation")
        return data?._id ? data : null
    } catch (error) {
        console.error("createConversation failed:", error?.message)
        return null
    }
}
