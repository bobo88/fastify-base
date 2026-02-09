import { FastifyRequest, FastifyReply } from "fastify";

interface Params {
  id: string;
}

export async function getUserHandler(
  request: FastifyRequest<{ Params: Params }>,
  reply: FastifyReply
) {
  return {
    id: request.params.id,
    name: "Fastify User",
  };
}
