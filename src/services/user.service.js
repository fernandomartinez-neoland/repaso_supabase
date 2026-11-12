import * as userModel from "../models/user.model.js";
import { createToken } from "./token.service.js";
import bcrypt from "bcrypt";

export async function registerUserService(req) {
  let { email, password, name, username, address } = req.body;
  try {
    const saltRounds = 10;
    password = await bcrypt.hash(password, saltRounds);

    await userModel.registerUserModel(email, password, name, username, address);
    return {
      status: 201,
      message: "usuario registrado",
    };
  } catch (e) {
    if (e.sqlState === "23505") {
      return {
        status: 409,
        message: "Correo duplicado",
      };
    }

    return {
      status: 400,
      message: "Error al crear usuario",
    };
  }
}

export async function loginUserService(req) {
  const { email, password } = req.body;
  try {
    const userData = await userModel.getUserModel(email);
    if (userData) {
      const pass = await bcrypt.compare(password, userData.password);
      if (pass) {
        const tokenUserData={
          name: userData.name,
          email: userData.email,
          username: userData.username,
          address: userData.address
        }
        const token= createToken(tokenUserData)
        return {
          status: 200,
          message: token,
        };
      } else {
        return { status: 401, message: "no autorizado" };
      }
    } else {
      return { status: 401, message: "no autorizado" };
    }
  } catch (e) {
    return { status: 500, message: "no se que paso pero me caes mal" };
  }
}

export async function getAllUsersService(){
  try{
  const users= await userModel.getAllUsersModel()
  return {
    status:200,
    message:users
  }
  }catch(e){
    return {
    status:403,
    message:"problemas"
  }
  }
}