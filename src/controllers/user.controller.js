import * as userService from "../services/user.service.js";


export async function registerUserController(req, res) {
  const response = await userService.registerUserService(req)
  res.status(response.status).send(response.message);
}


export async function loginUserController(req, res){
  const login=await userService.loginUserService(req)
  res.status(login.status).send(login.message)
}

export async function getAllUsersController(req, res){
   const users=await userService.getAllUsersService()
  res.status(users.status).send(users.message)
}
