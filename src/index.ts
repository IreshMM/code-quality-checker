import { Application } from "probot"; // eslint-disable-line no-unused-vars
import { onPush } from "./listeners";
import webHookRouter from "./webhooks";
import apiRouter from "./api";

export = (app: Application) => {
  app.on("push", onPush);
  app.route("/").use("/webhooks", webHookRouter).use("/api/v1", apiRouter);
};
