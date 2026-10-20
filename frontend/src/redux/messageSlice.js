import { createSlice } from "@reduxjs/toolkit";

const messageSlice = createSlice({
  name: "message",
  initialState: {
    messages: [],
    artifacts: [],
    isLoading: false,
    activeAgent: "auto", // "auto" | "chat" | "coding" | "ppt" | "pdf" | "pdfRag" | "vision" | "search" | "billing"
    executingStatus: "",
    // Draft text for the composer. Quick-start chips write here so the
    // controlled textarea picks the value up through a normal React update
    // instead of mutating the DOM directly.
    draftPrompt: ""
  },
  reducers: {
    setMessages: (state, action) => {
      state.messages = action.payload
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload)
    },
    setArtifacts: (state, action) => {
      state.artifacts = action.payload
    },
    setIsLoading: (state, action) => {
      state.isLoading = action.payload
    },
    setActiveAgent: (state, action) => {
      state.activeAgent = action.payload
    },
    setExecutingStatus: (state, action) => {
      state.executingStatus = action.payload
    },
    setDraftPrompt: (state, action) => {
      state.draftPrompt = action.payload
    }
  }
})

export const {
  setMessages,
  addMessage,
  setArtifacts,
  setIsLoading,
  setActiveAgent,
  setExecutingStatus,
  setDraftPrompt
} = messageSlice.actions

export default messageSlice.reducer
