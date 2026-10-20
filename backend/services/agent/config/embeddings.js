import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import dotenv from "dotenv"
dotenv.config()

/**
 * Lazily constructed Gemini embedding model.
 *
 * The constructor validates the API key and throws when it is missing, which
 * would take the whole agent service down on boot. The model is only built the
 * first time an embedding is actually needed.
 */
let model = null

export const getEmbeddings = () => {
    if (!model) {
        const apiKey = (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "").trim()

        if (!apiKey) {
            throw new Error(
                "Embeddings are unavailable: GOOGLE_API_KEY / GEMINI_API_KEY is not configured. " +
                "Add it to your .env file to enable the RAG agent."
            )
        }

        model = new GoogleGenerativeAIEmbeddings({
            apiKey,
            model: "gemini-embedding-001"
        })
    }

    return model
}

/**
 * Backwards-compatible accessor that resolves the embedding model lazily.
 */
export const embeddings = new Proxy(
    {},
    {
        get(_target, prop) {
            const instance = getEmbeddings()
            const value = instance[prop]
            return typeof value === "function" ? value.bind(instance) : value
        }
    }
)
