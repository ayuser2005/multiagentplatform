import { useEffect, useState } from 'react'
import Home from './pages/Home.jsx'
import getCurrentUser from './features/getCurrentUser.js'
import { useDispatch } from 'react-redux'
import { setUserdata } from './redux/userSlice.js'

function App() {
  const dispatch = useDispatch()
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      try {
        const data = await getCurrentUser()
        if (data) {
          dispatch(setUserdata(data))
        }
      } finally {
        // Always release the splash screen, even if the request failed.
        setIsCheckingSession(false)
      }
    }

    getUser()
  }, [dispatch])

  // Avoid flashing the sign-in modal on every page reload while the existing
  // session is being restored.
  if (isCheckingSession) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-indigo-600 font-bold">
            N
          </div>
          <span className="text-xs text-slate-400">Loading workspace...</span>
        </div>
      </div>
    )
  }

  return <Home />
}

export default App
