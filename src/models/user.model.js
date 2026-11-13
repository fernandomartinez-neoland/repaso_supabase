import { db } from "../prisma/db.ts";

export async function registerUserModel(
  email,
  password,
  name,
  username,
  address,
  embedding
) {
  const created = await db.orm.public.User.create({
    email,
    password,
    name,
    username,
    address,
    embedding
  });

  return created;
}

export async function getUserModel(email) {
  email;

  const result = db.orm.public.User.where({
    email,
  }).first();

  return result;
}

export async function getAllUsersModel(email) {
  email;

  const result = db.orm.public.User.where({
    email,
  }).all();

  return result;
}


export async function getVerctorUserModel(embedding){
  const nearest = await db.orm.public.User.using.embedding_nearest(embedding).all();
  return nearest
}