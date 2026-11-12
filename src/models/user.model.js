import { db } from "../prisma/db.ts";
export async function registerUserModel(
  email,
  password,
  name,
  username,
  address,
) {
    const created = await db.orm.public.User.create({
      email,
      password,
      name,
      username,
      address,
    });

    return created;

}
