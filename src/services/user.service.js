import * as userModel from "../models/user.model.js";
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
