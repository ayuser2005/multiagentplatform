import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Canonical filesystem locations for the Agent service.
 *
 * These are anchored to the service directory (NOT process.cwd()) so that the
 * upload directory, the generated-artifact directory and the download handler
 * always agree - in Docker (WORKDIR /app/services/agent) and when the service
 * is started from the repository root during local development.
 */
export const TEMP_DIR = path.resolve(__dirname, "..", "temp")
export const PROJECTS_DIR = path.join(TEMP_DIR, "projects")

export const ensureTempDirs = () => {
    for (const dir of [TEMP_DIR, PROJECTS_DIR]) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
    }
    return TEMP_DIR
}

/**
 * Resolve a user/LLM supplied filename to an absolute path that is guaranteed
 * to stay inside the temp directory. Any attempt to traverse out of the
 * directory (e.g. "../../etc/passwd") is rejected.
 */
export const resolveSafeTempPath = (fileName, baseDir = TEMP_DIR) => {
    if (!fileName || typeof fileName !== "string") {
        throw new Error("Invalid file name")
    }

    const safeName = path.basename(fileName)
    if (!safeName || safeName === "." || safeName === "..") {
        throw new Error("Invalid file name")
    }

    const resolvedBase = path.resolve(baseDir)
    const resolved = path.resolve(resolvedBase, safeName)

    if (resolved !== resolvedBase && !resolved.startsWith(resolvedBase + path.sep)) {
        throw new Error("Invalid file name")
    }

    return resolved
}

/**
 * Sanitize a filename coming from an LLM-generated file manifest so it can be
 * safely written to disk and used as a ZIP entry name (prevents Zip-Slip).
 */
export const sanitizeFileName = (fileName) => {
    if (!fileName || typeof fileName !== "string") {
        return "file.txt"
    }

    // Strip any directory component, then allow only safe characters.
    const base = path.basename(fileName.replace(/\\/g, "/"))
    const cleaned = base
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/^\.+/, "")
        .slice(0, 120)

    return cleaned || "file.txt"
}
