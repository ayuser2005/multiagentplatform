import { TavilySearch } from "@langchain/tavily";
import dotenv from "dotenv";
dotenv.config();

/**
 * Lazily constructed Tavily search tool.
 *
 * `TavilySearch` validates the API key in its constructor and throws when it
 * is missing. Building it at import time would crash the agent service on
 * boot whenever TAVILY_API_KEY was not configured. The tool is therefore only
 * created the first time a search is actually performed.
 */
let tool = null;

export const getSearchTool = () => {
    if (!tool) {
        const apiKey = (process.env.TAVILY_API_KEY || "").trim();

        if (!apiKey) {
            throw new Error(
                "Web search is unavailable: TAVILY_API_KEY is not configured. Add it to your .env file to enable the Search agent."
            );
        }

        tool = new TavilySearch({
            apiKey,
            maxResults: 5,
            topic: "general",
            includeImages: true
        });
    }

    return tool;
};

/**
 * Backwards-compatible accessor.
 * Returns the tool instance, or `null` when Tavily is not configured - so
 * that agents can gracefully skip the search step instead of crashing.
 */
export const searchTool = new Proxy(
    {},
    {
        get(_target, prop) {
            const instance = getSearchTool();
            const value = instance[prop];
            return typeof value === "function" ? value.bind(instance) : value;
        }
    }
);
