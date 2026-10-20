import { signOut } from 'firebase/auth'
import api from '../utils/axios'
import { auth } from '../utils/firebase'

/**
 * Log the user out of both the backend session and Firebase.
 * Without the Firebase sign-out the Google session survives and the next
 * "Continue with Google" click silently re-authenticates the same account.
 */
async function logOut() {
  try {
    await api.get('/api/auth/logout')
  } catch (error) {
    console.error("Logout request failed:", error?.message)
  }

  try {
    await signOut(auth)
  } catch (error) {
    console.error("Firebase sign-out failed:", error?.message)
  }
}

export default logOut
