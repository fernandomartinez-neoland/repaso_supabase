export function roleMiddleware(req, res, next) {
  if (req.body?.rol === "admin") {
    next();
  } else {
    res.status(401).send("no autorizado");
  }
}
