import redis from "../../shared/redis/redis.js"

const protect = async (req, res, next) => {
    try {
        const sessionId = req.cookies?.session
        if (!sessionId) {
            return res.status(401).json({ message: "Authentication required" })
        }

        const session = await redis.get(`session-${sessionId}`)
        if (!session) {
            return res.status(401).json({ message: "Session expired or invalid" })
        }

        // A malformed session payload means the session cannot be trusted.
        // Treat it as an invalid session instead of surfacing a 500.
        let user
        try {
            user = JSON.parse(session)
        } catch {
            return res.status(401).json({ message: "Session expired or invalid" })
        }

        if (!user || !user.userId) {
            return res.status(401).json({ message: "Session expired or invalid" })
        }

        req.user = user
        next()
    } catch (error) {
        console.error("[Gateway Auth Error]:", error.message)
        return res.status(500).json({ message: "Internal authentication error" })
    }
}

export default protect