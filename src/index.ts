import { Application } from "probot"; // eslint-disable-line no-unused-vars
import { onPush } from "./listeners";
import webHookRouter from "./webhooks";

export = (app: Application) => {
  app.on("push", onPush);
  app.route("/").use("/webhooks", webHookRouter);
};