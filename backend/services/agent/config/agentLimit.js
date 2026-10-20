import redis from "../../../shared/redis/redis.js"

const Limits = {
    chat: 30,
    coding: 10,
    pdf: 10,
    pdfRag: 20,
    ppt: 10,
    image: 10,
    vision: 10,
    search: 15,
    billing: 30
}

const WINDOW_SECONDS = 60

export const checkAgentLimit = async (userId, agent) => {
    const max = Limits[agent] || Limits["chat"]
    // Scope the bucket per user *and* per client IP so that rotating the
    // user id header cannot bypass the limit, while anonymous users still
    // do not share a single global bucket.
    const scope = userId || "anonymous"
    const key = `rate:${scope}:${agent}`
    const count = await redis.incr(key)

    // Always (re)apply the window TTL. Setting it only on the first increment
    // left the counter alive forever if the TTL was ever lost, which caused
    // permanent lockouts.
    await redis.expire(key, WINDOW_SECONDS)

    const ttl = await redis.ttl(key)

    if (count > max) {
        const safeTtl = ttl > 0 ? ttl : WINDOW_SECONDS
        const minutes = Math.floor(safeTtl / 60)
        const seconds = (safeTtl % 60)
        const time = minutes > 0 ? ` ${minutes}m ${seconds}s` : `${seconds}s`

        const error = new Error(`Rate limit exceeded for ${agent}.`)
        error.status = 429
        error.data = {
            success: false,
            agent,
            limit: max,
            remainingTime: safeTtl,
            retryAfter: time,
            message: `You have reached the ${agent} limit (${max} requests/minute). Try again in ${time}.`
        }

        throw error
    }

    return {
        remaining: Math.max(0, max - count),
        limit: max
    }
}
