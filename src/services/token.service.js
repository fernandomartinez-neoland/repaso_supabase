import jwt from "jsonwebtoken";
import "dotenv/config";

const tokenKey = process.env.tokenKey;
export function createToken(userData) {
  return jwt.sign(userData, tokenKey);
}

export function validateToken(token) {
  return jwt.verify(token, tokenKey);
}
