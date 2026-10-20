import { Annotation } from "@langchain/langgraph";

export const agentState = Annotation.Root({
    prompt: Annotation(),
    aiResponse: Annotation(),
    agent: Annotation(),
    nextAgent: Annotation(),
    conversationId: Annotation(),
    searchResults: Annotation(),
    images: Annotation(),
    imageKeys: Annotation(),
    artifacts: Annotation(),
    sources: Annotation(),
    userId: Annotation(),
    file: Annotation(),
    sourceContext: Annotation(),
    structuredData: Annotation(),
    // Counts how many agent-to-agent handoffs have happened in this run.
    // Uses a reducer channel so that each handoff adds to the running total
    // instead of overwriting it.
    handoffCount: Annotation({
        reducer: (current, update) => (current ?? 0) + (update ?? 0),
        default: () => 0
    }),
    aspectRatio: Annotation(),
    imageMode: Annotation(),
    hasContextReference: Annotation()
})