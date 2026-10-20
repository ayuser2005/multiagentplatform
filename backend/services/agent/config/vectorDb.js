import { QdrantVectorStore } from "@langchain/qdrant";
import { getEmbeddings } from "./embeddings.js";
import dotenv from "dotenv";
dotenv.config();

const getQdrantConfig = () => {
    const config = {
        url: (process.env.QDRANT_URL || process.env.QDRANT_ENDPOINT || "").trim(),
        apiKey: (process.env.QDRANT_API_KEY || "").trim()
    };

    if (!config.url) {
        throw new Error(
            "Vector store is unavailable: QDRANT_URL is not configured. " +
            "Add it to your .env file to enable the RAG agent."
        );
    }

    return config;
};

export const vectorStore = async (docs, collectionName) => {
    const config = getQdrantConfig();
    return await QdrantVectorStore.fromDocuments(docs, getEmbeddings(), {
        url: config.url,
        apiKey: config.apiKey,
        collectionName
    });
};

export const getVectorStore = async (collectionName) => {
    const config = getQdrantConfig();
    return await QdrantVectorStore.fromExistingCollection(getEmbeddings(), {
        url: config.url,
        apiKey: config.apiKey,
        collectionName
    });
};
