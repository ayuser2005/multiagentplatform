import { useEffect } from 'react'
import Nav from './Nav'
import MessageList from './MessageList'
import ChatInput from './ChatInput'
import { useDispatch, useSelector } from 'react-redux'
import getMessages from '../features/getMessages'
import { setArtifacts, setMessages } from '../redux/messageSlice'

function ChatArea() {
  const { selectedConversation } = useSelector(state => state.conversation)
  const dispatch = useDispatch()

  useEffect(() => {
    let cancelled = false
    const conversationId = selectedConversation?._id

    const getMesg = async () => {
      // A conversation that was just created on the client has no server-side
      // messages yet. Fetching it would return an empty list and wipe the
      // message the user just typed, so the local state is kept as-is.
      if (selectedConversation?.hydrated === false) {
        return
      }

      if (conversationId) {
        const data = await getMessages(conversationId)

        // Ignore responses that arrive after the user switched conversation.
        if (cancelled) return

        dispatch(setMessages(data || []))
        const latestArtifactMessage = [...(data || [])]
          .reverse()
          .find(msg => msg.artifacts && msg.artifacts.length > 0)
        dispatch(setArtifacts(latestArtifactMessage?.artifacts || []))
      } else {
        dispatch(setMessages([]))
        dispatch(setArtifacts([]))
      }
    }

    getMesg()

    return () => {
      cancelled = true
    }
  }, [selectedConversation?._id, selectedConversation?.hydrated, dispatch])

  return (
    <div className='flex-1 flex flex-col min-w-0'>
      <Nav />
      <MessageList />
      <ChatInput />
    </div>
  )
}

export default ChatArea
