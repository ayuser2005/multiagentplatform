import {
  Code2,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Globe,
  Image as ImageIcon,
  MessageSquare,
  Presentation,
  Sparkles,
  Zap
} from 'lucide-react'

/**
 * Single source of truth for every agent the platform can route to.
 *
 * The backend router normalises the aliases below (see backend/services/agent/graph/router.js),
 * so the UI uses the same alias keys when resolving a label for an agent id
 * returned by the API.
 */
export const AGENT_META = {
  coding: {
    name: "Coding Specialist",
    short: "Coding",
    icon: Code2,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200/80 text-blue-700",
    dot: "bg-blue-600"
  },
  ppt: {
    name: "Presentation Designer",
    short: "Slides",
    icon: Presentation,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200/80 text-purple-700",
    dot: "bg-purple-600"
  },
  pdf: {
    name: "Document Publisher",
    short: "PDF",
    icon: FileText,
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200/80 text-amber-800",
    dot: "bg-amber-700"
  },
  pdfRag: {
    name: "Document & Data Analyst",
    short: "RAG",
    icon: FileSpreadsheet,
    color: "text-teal-700",
    bg: "bg-teal-50 border-teal-200/80 text-teal-800",
    dot: "bg-teal-700"
  },
  rag: {
    name: "Document & Data Analyst",
    short: "RAG",
    icon: FileSpreadsheet,
    color: "text-teal-700",
    bg: "bg-teal-50 border-teal-200/80 text-teal-800",
    dot: "bg-teal-700"
  },
  vision: {
    name: "Visual & Image Studio",
    short: "Vision",
    icon: ImageIcon,
    color: "text-rose-600",
    bg: "bg-rose-50 border-rose-200/80 text-rose-700",
    dot: "bg-rose-600"
  },
  image: {
    name: "Visual & Image Studio",
    short: "Vision",
    icon: ImageIcon,
    color: "text-rose-600",
    bg: "bg-rose-50 border-rose-200/80 text-rose-700",
    dot: "bg-rose-600"
  },
  imageAnalyzer: {
    name: "Image & Vision Analyst",
    short: "Vision",
    icon: Sparkles,
    color: "text-pink-700",
    bg: "bg-pink-50 border-pink-200/80 text-pink-700",
    dot: "bg-pink-600"
  },
  search: {
    name: "Web Intelligence Agent",
    short: "Search",
    icon: Globe,
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200/80 text-emerald-800",
    dot: "bg-emerald-600"
  },
  billing: {
    name: "Billing & Account Assistant",
    short: "Billing",
    icon: CreditCard,
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200/80 text-amber-800",
    dot: "bg-amber-600"
  },
  chat: {
    name: "Nexora Assistant",
    short: "Chat",
    icon: MessageSquare,
    color: "text-indigo-600",
    bg: "bg-indigo-50 border-indigo-200/80 text-indigo-700",
    dot: "bg-indigo-600"
  },
  auto: {
    name: "Autonomous Router",
    short: "Auto",
    icon: Zap,
    color: "text-indigo-600",
    bg: "bg-indigo-50 border-indigo-200/80 text-indigo-700",
    dot: "bg-indigo-600"
  }
}

/**
 * Resolve an agent id (as returned by the backend) to its display metadata.
 * Falls back to the general assistant when the id is unknown.
 */
export const resolveAgentMeta = (agentId) => {
  const key = typeof agentId === "string" ? agentId.toLowerCase() : ""
  return AGENT_META[key] || AGENT_META.chat
}
