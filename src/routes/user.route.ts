import { FastifyInstance } from "fastify";
import { getUserHandler } from "../controllers/user.controller";
import { getUserSchema } from "../schemas/user.schema";

export async function userRoutes(app: FastifyInstance) {
  app.get("/user/:id", {
    schema: getUserSchema,
    handler: getUserHandler,
  });
}
