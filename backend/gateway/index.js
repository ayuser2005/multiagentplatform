import express from "express"
import dotenv from "dotenv"
import proxy from "express-http-proxy"
dotenv.config()
import cors from "cors"
import cookieParser from "cookie-parser"
import { getCurrentUser } from "./controllers/user.controller.js"
import protect from "./middleware/auth.middleware.js"
import { proxyWithHeader } from "./utils/proxyWithHeader.js"
import morgan from "morgan"

const port = process.env.PORT || 8000

const app = express()

// -----------------------------------------------------------------------------
// Secure CORS configuration
// -----------------------------------------------------------------------------
// FRONTEND_URL may be a comma-separated list of allowed origins.
// Origins are matched EXACTLY (never by prefix) to avoid origin spoofing.
const configuredOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean)

const allowedOrigins = new Set([
    ...configuredOrigins,
    "http://localhost",
    "http://127.0.0.1"
])

const isLocalOrigin = (origin) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)

app.use(cors({
    origin: (origin, callback) => {
        // Non-browser clients (curl, health checks, server-to-server) send no Origin.
        if (!origin) return callback(null, true)

        const normalized = origin.replace(/\/+$/, "")

        if (isLocalOrigin(normalized) || allowedOrigins.has(normalized)) {
            return callback(null, true)
        }

        console.warn(`[gateway] CORS blocked for origin: ${origin}`)
        return callback(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true
}))

app.use(morgan("dev"))
app.use(cookieParser())

// -----------------------------------------------------------------------------
// Public Auth Proxy
// -----------------------------------------------------------------------------
// Only the login/logout endpoints are meant to be reachable from the browser.
// Credit and plan mutation endpoints are service-to-service only and are
// rejected at the edge so they can never be reached from the public internet.
const authProxy = proxy(process.env.AUTH_SERVICE || "http://auth:8001")

app.use("/api/auth", (req, res, next) => {
    const internalOnlyRoutes = ["/update-plan", "/deduct-credits", "/user/"]

    const isInternalOnly = internalOnlyRoutes.some((route) =>
        req.path === route || req.path.startsWith(route)
    )

    if (isInternalOnly) {
        return res.status(403).json({
            message: "Forbidden: this endpoint is for internal service communication only"
        })
    }

    return authProxy(req, res, next)
})

// Public File Download & Preview Proxy
app.use("/api/agent/download", proxy(process.env.AGENT_SERVICE || "http://agent:8003", {
    proxyReqPathResolver: (req) => `/download/${req.url.replace(/^\//, "")}`
}))
app.use("/api/agent/file", proxy(process.env.AGENT_SERVICE || "http://agent:8003", {
    proxyReqPathResolver: (req) => `/file/${req.url.replace(/^\//, "")}`
}))

// The agent service persists conversation turns through the chat service.
// That endpoint is service-to-service only - exposing it would let any
// authenticated user write messages into arbitrary conversations.
// NOTE: this must be registered BEFORE the /api/chat proxy below, otherwise
// Express would forward the request upstream first.
app.use("/api/chat/save-message", (req, res) => {
    return res.status(403).json({
        message: "Forbidden: this endpoint is for internal service communication only"
    })
})

// Protected Microservice Proxies
app.use("/api/chat", protect, proxyWithHeader(process.env.CHAT_SERVICE || "http://chat:8002"))
app.use("/api/agent", protect, proxyWithHeader(process.env.AGENT_SERVICE || "http://agent:8003"))
app.use("/api/billing", protect, proxyWithHeader(process.env.BILLING_SERVICE || "http://billing:8004"))

// Current user profile
app.get("/api/me", protect, getCurrentUser)

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "healthy", service: "api-gateway", timestamp: new Date().toISOString() })
})
app.get("/", (req, res) => {
    res.json({ message: "Nexora AI API Gateway Online", version: "2.0" })
})

// Centralised error handler (keeps CORS rejections from crashing the process)
app.use((err, req, res, next) => {
    console.error("[gateway] Unhandled error:", err.message)
    if (res.headersSent) return next(err)
    return res.status(500).json({ message: "Internal gateway error" })
})

app.listen(port, () => {
    console.log(`Nexora API Gateway running on port ${port}`)
})
