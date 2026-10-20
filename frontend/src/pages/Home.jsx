import { useEffect, useState } from 'react'
import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../utils/firebase'
import api from '../utils/axios'
import { FcGoogle } from 'react-icons/fc'
import { useDispatch, useSelector } from 'react-redux'
import { setUserdata } from '../redux/userSlice'
import SideBar from '../components/SideBar'
import ChatArea from '../components/ChatArea'
import Artifact from '../components/Artifact'
import { SESSION_EXPIRED_EVENT } from '../utils/axios'

function Home() {
    const { userData } = useSelector(state => state.user)
    const dispatch = useDispatch()
    const [loginError, setLoginError] = useState(null)
    const [isSigningIn, setIsSigningIn] = useState(false)

    // A 401 from any API call means the session is gone -> drop the user back
    // to the sign-in screen instead of showing an empty workspace.
    useEffect(() => {
        const handleSessionExpired = () => {
            dispatch(setUserdata(null))
        }

        window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
        return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    }, [dispatch])

    const handleLogin = async (token) => {
        try {
            const { data } = await api.post("/api/auth/login", { token })
            dispatch(setUserdata(data))
            return true
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                "Sign-in failed. Please try again in a moment."
            setLoginError(message)
            return false
        }
    }

    const googleLogin = async () => {
        if (isSigningIn) return

        setIsSigningIn(true)
        setLoginError(null)

        try {
            const result = await signInWithPopup(auth, googleProvider)
            const token = await result.user.getIdToken()
            await handleLogin(token)
        } catch (error) {
            // A closed popup is a normal user action, not an error worth showing.
            if (error?.code !== "auth/popup-closed-by-user") {
                setLoginError(
                    error?.message ||
                        "Could not complete sign-in. Please check your connection and try again."
                )
            }
        } finally {
            setIsSigningIn(false)
        }
    }

    return (
        <div className='h-screen flex bg-[#f8fafc] text-slate-900 overflow-hidden font-sans'>
            <SideBar />
            <ChatArea />
            <Artifact />

            {!userData && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs'>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="nexora-login-title"
                        className='w-[360px] bg-white border border-slate-200 shadow-2xl rounded-2xl p-7 flex flex-col gap-5'
                    >
                        <div className='flex flex-col gap-1.5 text-center'>
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 mb-1">
                                <span className="text-lg font-bold">N</span>
                            </div>
                            <h2 id="nexora-login-title" className='text-[18px] font-bold text-slate-900 tracking-tight'>Welcome to Nexora</h2>
                            <p className='text-[13px] text-slate-500 leading-relaxed'>Your collaborative AI workspace. Sign in to research, code, analyze documents, and generate deliverables.</p>
                        </div>

                        {loginError && (
                            <div
                                role="alert"
                                className='rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 leading-relaxed'
                            >
                                {loginError}
                            </div>
                        )}

                        <button
                            type="button"
                            disabled={isSigningIn}
                            aria-busy={isSigningIn}
                            className='w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
                            onClick={googleLogin}
                        >
                            <FcGoogle size={18} />
                            <span>{isSigningIn ? 'Signing in...' : 'Continue with Google'}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Home
