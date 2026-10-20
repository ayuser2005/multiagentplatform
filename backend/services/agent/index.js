import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/db.js"
import router from "./routes/agent.route.js"
import { ensureTempDirs } from "./config/paths.js"
dotenv.config()

const port =process.env.PORT || 8003

const app=express()

app.use(express.json({ limit: "2mb" }))
app.use("/",router)

app.get("/health",(req,res)=>{
    res.status(200).json({
        status: "healthy",
        service: "agent",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    })
})

app.use((err,req,res,next)=>{
  console.error("[agent] Request failed:", err?.message || err)

  if(res.headersSent){
    return next(err)
  }

  // Preserve the status/data contract used by the rate limiter and multer.
  if(err.status){
    return res.status(err.status).json(err.data || { message: err.message })
  }

  if(err.code === "LIMIT_FILE_SIZE"){
    return res.status(413).json({ message: "Uploaded file exceeds the 50MB limit" })
  }

  if(err.code === "LIMIT_UNEXPECTED_FILE"){
    return res.status(400).json({ message: "Unexpected file field. Upload a single file under the 'file' field." })
  }

  // Do not leak internal stack traces to the client.
  return res.status(500).json({ message: "The agent service could not complete this request" })
})

app.get("/",(req,res)=>{
    res.json({message:"hello from agent"})
})

app.listen(port,()=>{
    console.log(`agent started at ${port}`)
    ensureTempDirs()
    connectDb()
})
