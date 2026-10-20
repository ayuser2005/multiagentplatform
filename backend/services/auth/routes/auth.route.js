import express from "express";
import { deductCredits, getUserById, login, logOut, updateUserPayment } from "../controllers/auth.controller.js"
import requireInternalSecret from "../middleware/internalAuth.middleware.js"

const router = express.Router()

// ---- Public endpoints (reachable through the gateway) ----
router.post("/login", login)
router.get("/logout", logOut)

// ---- Internal service-to-service endpoints (never exposed publicly) ----
router.post("/update-plan", requireInternalSecret, updateUserPayment)
router.post("/deduct-credits", requireInternalSecret, deductCredits)

router.get("/user/:id", getUserById)

export default router
