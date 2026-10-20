import Razorpay from "razorpay"
import dotenv from "dotenv"
dotenv.config()

let client = null

/**
 * Lazily construct the Razorpay client.
 *
 * The Razorpay SDK throws at construction time when the credentials are
 * missing. Constructing it eagerly would crash the whole billing service on
 * boot whenever the keys were not configured, taking the health check (and
 * therefore the whole Compose stack) down with it.
 */
const getRazorpay = () => {
    if (!client) {
        const key_id = process.env.RAZORPAY_KEY_ID
        const key_secret = process.env.RAZORPAY_KEY_SECRET

        if (!key_id || !key_secret) {
            throw new Error(
                "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable payments."
            )
        }

        client = new Razorpay({ key_id, key_secret })
    }

    return client
}

export default getRazorpay
