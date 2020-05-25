import { Application } from "probot"; // eslint-disable-line no-unused-vars
import { onPush, onPullRequest, onInstallation } from "./listeners";
import webHookRouter from "./webhooks";
import apiRouter from "./api";

export = (app: Application) => {
  app.on("installation.created", onInstallation);
  app.on("push", onPush);
  app.on("pull_request.opened", onPullRequest);
  app.route("/").use("/webhooks", webHookRouter).use("/api/v1", apiRouter);
};
