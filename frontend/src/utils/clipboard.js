/**
 * Copy text to the clipboard with a fallback for non-secure contexts.
 *
 * `navigator.clipboard` is only available in secure contexts (HTTPS or
 * localhost). The production deployment can be served over plain HTTP, where
 * `navigator.clipboard` is undefined and every "Copy" button silently fails.
 * The `document.execCommand('copy')` path keeps the feature working there.
 */
export const copyToClipboard = async (text) => {
  const value = String(text ?? "")

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // Fall through to the legacy path below.
    }
  }

  try {
    const textArea = document.createElement("textarea")
    textArea.value = value
    textArea.setAttribute("readonly", "")
    textArea.style.position = "fixed"
    textArea.style.opacity = "0"
    document.body.appendChild(textArea)
    textArea.select()
    const copied = document.execCommand("copy")
    document.body.removeChild(textArea)
    return copied
  } catch {
    return false
  }
}

export default copyToClipboard
