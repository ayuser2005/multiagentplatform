import fs from "fs"
import path from "path"
import multer from "multer"
import { TEMP_DIR, ensureTempDirs } from "./paths.js"

const uploadDir = ensureTempDirs()

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir)
    },
    filename(req, file, cb) {
        const ext = path.extname(file.originalname || "").toLowerCase()
        const base = path.basename(file.originalname || "upload", ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60)
        cb(null, `${Date.now()}-${base || "upload"}${ext}`)
    }
})

const ALLOWED_EXTENSIONS = new Set([
    ".pdf", ".doc", ".docx", ".txt", ".csv", ".xls", ".xlsx",
    ".json", ".md", ".png", ".jpg", ".jpeg", ".webp", ".gif"
])

const ALLOWED_MIME_PREFIXES = ["image/"]
const ALLOWED_MIME_TYPES = new Set([
    "application/pdf",
    "application/json",
    "text/plain",
    "text/csv",
    "text/markdown",
    "application/msword",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
])

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase()
    const mime = (file.mimetype || "").toLowerCase()

    const extensionAllowed = ALLOWED_EXTENSIONS.has(ext)
    const mimeAllowed =
        ALLOWED_MIME_TYPES.has(mime) ||
        ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))

    if (extensionAllowed || mimeAllowed) {
        return cb(null, true)
    }

    const error = new Error(
        `Unsupported file type "${ext || mime}". Allowed types: ${[...ALLOWED_EXTENSIONS].join(", ")}`
    )
    error.status = 415
    return cb(error)
}

export { TEMP_DIR }

export default multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
        files: 1
    }
})
