import fp from "fastify-plugin";

export default fp(async (app) => {
  app.decorate("db", {
    connect: () => console.log("DB connected"),
  });
});
