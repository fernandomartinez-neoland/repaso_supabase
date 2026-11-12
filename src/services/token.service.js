import jwt from 'jsonwebtoken'
import 'dotenv/config'
export function createToken(userData){
    console.log(userData)
    return jwt.sign(userData, process.env.tokenKey);
}

export function validateToken(token){}