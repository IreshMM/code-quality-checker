import { Context } from "probot";
import Webhooks from "@octokit/webhooks";
import * as utils from "./utils";
import { getCommitSha } from "./getters";
import { Request, Response } from "express";

export async function onPush(context: Context<Webhooks.WebhookPayloadPush>) {
  console.log("onPushExecution");

  if (utils.determineProjectType(context) === utils.ProjectType.JAVA) {
      console.log("insideProjectTypeJava");
      
    await utils.cleanWorkspace(getCommitSha(context.payload));
    await utils.cloneCommit(context.payload);

    utils.addWebhookEventListeners(context);
    utils.startSonarQubeScan(context);
  }
}

export function onSonarQubeWebhook(req: Request, res: Response) {
  utils.updateQualityGateStatus(req.body);
  res.sendStatus(200);
}
