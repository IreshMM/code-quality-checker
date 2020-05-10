import { Context } from "probot";
import Webhooks from "@octokit/webhooks";
import * as utils from "./utils";
import { Request, Response } from "express";

export async function onPush(context: Context<Webhooks.WebhookPayloadPush>) {
  console.log("onPushExecution");

  utils.determineProjectType(context).then((projectType: utils.ProjectType) => {
    if (projectType == utils.ProjectType.JAVA) {
      console.log("insideProjectTypeJava");

      utils.addWebhookEventListeners(context);
      utils.startSonarQubeScan(context);
    }
  });
}

export async function onPullRequest(context: Context<Webhooks.WebhookPayloadPullRequest>) {
  console.log("PullRequestCreationDetected");
  utils.determineProjectType(context).then((projectType: utils.ProjectType) => {
    if(projectType == utils.ProjectType.JAVA) {
      console.log("InsideProjectTypeJavaFromPullRequest");

      utils.startSonarQubePRAnalyzis(context);
    }
  })
}

export function onSonarQubeWebhook(req: Request, res: Response) {
  utils.updateQualityGateStatus(req.body);
  res.sendStatus(200);
}