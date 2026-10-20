import api from '../utils/axios'

/**
 * Send a message to the agent service.
 *
 * Errors are intentionally re-thrown so that callers can render a meaningful
 * message to the user. Swallowing them here produced empty assistant bubbles
 * with no indication that the request had failed.
 */
async function sendMessage(payload) {
  const { data } = await api.post('/api/agent/chat', payload)
  return data
}

export default sendMessage
