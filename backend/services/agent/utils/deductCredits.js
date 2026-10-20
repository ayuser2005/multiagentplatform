import axios from "axios"

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE || "http://auth:8001"
const INTERNAL_TIMEOUT_MS = Number(process.env.INTERNAL_CALL_TIMEOUT_MS) || 10000

export const deductCredits = async (userId, agent) => {
    if (!userId) {
        console.warn("[Billing] Credit deduction skipped: no userId supplied")
        return null
    }

    try {
        const { data } = await axios.post(
            `${AUTH_SERVICE_URL}/deduct-credits`,
            { userId, agent },
            {
                timeout: INTERNAL_TIMEOUT_MS,
                headers: {
                    "Content-Type": "application/json",
                    ...(process.env.INTERNAL_SERVICE_SECRET
                        ? { "x-internal-secret": process.env.INTERNAL_SERVICE_SECRET }
                        : {})
                }
            }
        )
        return data
    } catch (error) {
        const reason = error.response?.data?.message || error.message
        console.error(`[Billing] Credit deduction failed for ${agent}:`, reason)
        return null
    }
}
