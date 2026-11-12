import { validateToken } from "../services/token.service.js";
export function validateUserToken(req, res, next){
    // console.log(req)
    try{
        const token= req.headers.authorization.replace('Bearer ', '')
        validateToken(token)
        next()
    }catch(e){
        res.status(401).send("token no valido")
    }
}