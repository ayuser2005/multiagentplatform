/**
 * Guards routes that may only be called by other backend services
 * (billing -> auth, agent -> auth). These endpoints mutate credits and plan
 * state, so they must never be reachable from the public internet.
 *
 * Two layers of protection:
 *   1. The API Gateway blocks `/api/auth/update-plan` and `/api/auth/deduct-credits`
 *      from external requests.
 *   2. This middleware additionally requires a shared secret header when
 *      INTERNAL_SERVICE_SECRET is configured.
 */
const requireInternalSecret = (req, res, next) => {
    const expectedSecret = process.env.INTERNAL_SERVICE_SECRET;

    if (!expectedSecret) {
        console.warn(
            "[auth] INTERNAL_SERVICE_SECRET is not set. Internal routes are protected only by the API Gateway."
        );
        return next();
    }

    const providedSecret =
        req.get("x-internal-secret") ||
        req.headers["x-internal-secret"] ||
        req.headers["x-internal-secret".toUpperCase()];

    if (!providedSecret || providedSecret !== expectedSecret) {
        return res.status(403).json({ message: "Forbidden: internal service access only" });
    }

    return next();
};

export default requireInternalSecret;
