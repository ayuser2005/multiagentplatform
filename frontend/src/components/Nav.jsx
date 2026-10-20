import { Plus } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { setSelectedConversation } from '../redux/conversationSlice'
import { setActiveAgent } from '../redux/messageSlice'
import { AGENT_META } from '../constants/agents.js'

function Nav() {
  const { selectedConversation } = useSelector(state => state.conversation)
  const { messages, activeAgent, isLoading, executingStatus } = useSelector(state => state.message)
  const dispatch = useDispatch()

  const currentAgentKey = (activeAgent || "auto").toLowerCase()
  const agentInfo = AGENT_META[currentAgentKey] || AGENT_META.auto
  const AgentIcon = agentInfo.icon

  return (
    <header className='h-13 flex items-center justify-between px-4 md:px-6 border-b border-slate-200/80 bg-white/95 backdrop-blur-xs shrink-0 select-none'>
      {/* Left: Active Agent & Title */}
      <div className='flex items-center gap-3 min-w-0'>
        {/* Dynamic Active Agent Tag */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold shadow-2xs ${agentInfo.bg}`}>
          <AgentIcon size={13} className={agentInfo.color} />
          <span className={`${agentInfo.color} hidden sm:inline`}>{agentInfo.name}</span>
          <span className={`${agentInfo.color} sm:hidden`}>{agentInfo.name.split(" ")[0]}</span>
        </div>

        {/* Execution State or Conversation Title */}
        <div className='flex items-center gap-2 min-w-0'>
          {isLoading ? (
            <div className='flex items-center gap-2 text-xs font-medium text-indigo-600'>
              <span className='w-2 h-2 rounded-full bg-indigo-600 animate-ping' />
              <span className='truncate'>{executingStatus || "Executing..."}</span>
            </div>
          ) : (
            <>
              <h2 className='text-[13.5px] font-semibold text-slate-800 tracking-tight truncate max-w-[240px] md:max-w-md'>
                {selectedConversation?.title || "New Conversation"}
              </h2>
              <span className='hidden md:inline-block text-[10px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-mono'>
                {messages?.length || 0} msgs
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className='flex items-center gap-2'>
        <button
          onClick={() => {
            dispatch(setSelectedConversation(null))
            dispatch(setActiveAgent("auto"))
          }}
          className='flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 shadow-2xs transition cursor-pointer'
          title="Start fresh conversation"
        >
          <Plus size={13} />
          <span className='hidden sm:inline'>New Chat</span>
        </button>
      </div>
    </header>
  )
}

export default Nav
