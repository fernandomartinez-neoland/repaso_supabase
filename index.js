import express from 'express'
import 'dotenv/config'
import userRouter from './src/routers/user.route.js'

const port=process.env.port||3000

const app= express();
app.use(express.json())

app.get("/", (req, res)=>{
    res.send(req.body)
})

app.use('/api/user', userRouter)



app.listen(port, ()=>{
    console.log("http://localhost:"+port)
})