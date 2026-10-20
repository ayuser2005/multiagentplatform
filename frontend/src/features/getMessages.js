import api from '../utils/axios'

async function getMessages(id) {
    if (!id) return []

    try {
        const { data } = await api.get(`/api/chat/get-messages/${id}`)
        return Array.isArray(data) ? data : []
    } catch (error) {
        console.error("getMessages failed:", error?.message)
        return []
    }
}

export default getMessages
