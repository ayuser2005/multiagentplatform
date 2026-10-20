import redis from "../../../shared/redis/redis.js"
import { getMessages } from "../utils/getMessages.js"

// Conversation memory is kept in Redis for 24 hours.
const MEMORY_TTL_SECONDS = 24 * 60 * 60
const MAX_MEMORY_MESSAGES = 20

export const getMemory = async (conversationId) => {
    const key = `messages-${conversationId}`
    const cached = await redis.get(key)
    if (cached) {
        return JSON.parse(cached)
    }

    const messages = await getMessages(conversationId)
    await redis.set(key, JSON.stringify(messages), "EX", MEMORY_TTL_SECONDS)

    return messages
}

export const addMessage = async (conversationId, role, content) => {
    const key = `messages-${conversationId}`
    const rawMessages = await redis.get(key)
    const messages = rawMessages ? JSON.parse(rawMessages) : []
    messages.push({
        role,
        content
    })

    if (messages.length > MAX_MEMORY_MESSAGES) {
        messages.shift()
    }

    // Always refresh the TTL, otherwise the key would live forever and Redis
    // memory would grow without bound.
    await redis.set(key, JSON.stringify(messages), "EX", MEMORY_TTL_SECONDS)
}
