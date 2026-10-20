import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/db.js"
import router from "./routes/chat.routes.js"

dotenv.config()

const port =process.env.PORT || 8002

const app=express()
app.use(express.json())
app.use("/",router)

app.get("/health",(req,res)=>{
    res.status(200).json({
        status: "healthy",
        service: "chat",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    })
})

app.get("/",(req,res)=>{
    res.json({message:"hello from chat"})
})

app.listen(port,()=>{
    console.log(`chat started at ${port}`)
    connectDb()
})
