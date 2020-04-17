import { Context } from "probot";
import Webhooks from "@octokit/webhooks";
import * as utils from "./utils";
import { getCommitSha } from "./getters";
import { Request, Response } from "express";

export async function onPush(context: Context<Webhooks.WebhookPayloadPush>) {
  console.log("onPushExecution");
  await utils.cleanWorkspace(getCommitSha(context.payload));
  await utils.cloneCommit(context.payload);

  if ((await utils.determineProjectType(context)) === utils.ProjectType.JAVA) {
    console.log("insideProjectTypeJava");

    utils.addWebhookEventListeners(context);
    utils.startSonarQubeScan(context);
  }
}

export function onSonarQubeWebhook(req: Request, res: Response) {
  utils.updateQualityGateStatus(req.body);
  utils.cleanWorkspace(req.body.revision);
  res.sendStatus(200);
}
