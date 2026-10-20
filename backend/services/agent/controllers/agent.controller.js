import axios from "axios"
import fs from "fs"
import path from "path"
import { graph } from "../graph/graph.js"
import { addMessage } from "../config/memory.js"
import { saveAgentContext } from "../utils/contextManager.js"
import redis from "../../../shared/redis/redis.js"
import { TEMP_DIR, resolveSafeTempPath } from "../config/paths.js"

const CHAT_SERVICE_URL = process.env.CHAT_SERVICE || "http://chat:8002"
const INTERNAL_TIMEOUT_MS = Number(process.env.INTERNAL_CALL_TIMEOUT_MS) || 15000

const internalHeaders = () => ({
    "Content-Type": "application/json",
    ...(process.env.INTERNAL_SERVICE_SECRET
        ? { "x-internal-secret": process.env.INTERNAL_SERVICE_SECRET }
        : {})
})

const MAX_PROMPT_LENGTH = Number(process.env.MAX_PROMPT_LENGTH) || 20000

/**
 * Resolve a requested artifact filename to a safe absolute path.
 * Returns null when the name is invalid or tries to traverse outside temp.
 */
const safeArtifactPath = (filename) => {
    try {
        const filePath = resolveSafeTempPath(filename, TEMP_DIR)
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
            return null
        }
        return filePath
    } catch {
        return null
    }
}

export const agent = async (req, res, next) => {
    try {
        const { prompt, conversationId, agent: selectedAgent, aspectRatio, imageMode } = req.body
        const file = req.file
        const userId = req.headers["x-user-id"]

        // ---- Input validation -------------------------------------------------
        if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
            return res.status(400).json({ message: "A non-empty 'prompt' is required" })
        }
        if (prompt.length > MAX_PROMPT_LENGTH) {
            return res.status(413).json({
                message: `Prompt exceeds the maximum length of ${MAX_PROMPT_LENGTH} characters`
            })
        }
        if (!conversationId || typeof conversationId !== "string") {
            return res.status(400).json({ message: "A 'conversationId' is required" })
        }

        await axios.post(`${CHAT_SERVICE_URL}/save-message`, {
            conversationId, role: "user", content: prompt
        }, { headers: internalHeaders(), timeout: INTERNAL_TIMEOUT_MS })
            .catch(e => console.warn("Save user message warning:", e.message))

        const result = await graph.invoke({
            prompt, conversationId, agent: selectedAgent, userId, file, aspectRatio, imageMode
        })
        console.log("result", {
            agent: result?.agent,
            hasAiResponse: Boolean(result?.aiResponse),
            artifactsCount: result?.artifacts?.length || 0,
            sourcesCount: result?.sources?.length || 0
        })

        if (result?.aiResponse) {
            await addMessage(conversationId, "user", prompt).catch(() => {})
            await addMessage(conversationId, "assistant", result.aiResponse).catch(() => {})

            // Save structured agent context for downstream handoffs
            await saveAgentContext(conversationId, {
                agent: result?.agent || selectedAgent,
                prompt,
                content: result?.aiResponse,
                artifacts: result?.artifacts,
                sources: result?.sources,
                structuredData: result?.structuredData
            }).catch(() => {})
        }

        await axios.post(`${CHAT_SERVICE_URL}/save-message`, {
            conversationId,
            role: "assistant",
            agent: result?.agent || selectedAgent,
            content: result?.aiResponse,
            images: result?.images,
            artifacts: result?.artifacts,
            sources: result?.sources
        }, { headers: internalHeaders(), timeout: INTERNAL_TIMEOUT_MS })
            .catch(e => console.warn("Save assistant message warning:", e.message))

        return res.status(200).json({
            answer: result?.aiResponse,
            agent: result?.agent || selectedAgent,
            images: result?.images,
            artifacts: result?.artifacts,
            sources: result?.sources
        })
    } catch (error) {
        next(error)
    }
}

export const downloadFile = async (req, res) => {
    try {
        const { filename } = req.params
        const filePath = safeArtifactPath(filename)
        if (!filePath) {
            return res.status(404).json({ message: "File not found or expired" })
        }
        const safeName = path.basename(filePath)
        const ext = path.extname(safeName).toLowerCase()
        const mimeMap = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".pdf": "application/pdf", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation", ".zip": "application/zip" }
        res.setHeader("Content-Type", mimeMap[ext] || "application/octet-stream")
        res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`)
        res.setHeader("Content-Length", fs.statSync(filePath).size)
        const stream = fs.createReadStream(filePath)
        stream.on("error", () => res.status(500).end())
        return stream.pipe(res)
    } catch (error) {
        return res.status(500).json({ message: `Download error: ${error.message}` })
    }
}

export const viewFile = async (req, res) => {
    try {
        const { filename } = req.params
        const filePath = safeArtifactPath(filename)
        if (!filePath) {
            return res.status(404).json({ message: "File not found or expired" })
        }
        const safeName = path.basename(filePath)
        const ext = path.extname(safeName).toLowerCase()
        const mimeMap = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".pdf": "application/pdf" }
        res.setHeader("Content-Type", mimeMap[ext] || "application/octet-stream")
        res.setHeader("Cache-Control", "private, max-age=86400")
        res.setHeader("Content-Length", fs.statSync(filePath).size)
        const stream = fs.createReadStream(filePath)
        stream.on("error", () => res.status(500).end())
        return stream.pipe(res)
    } catch (error) {
        return res.status(500).json({ message: `View error: ${error.message}` })
    }
}