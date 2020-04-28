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
  console.log(context.payload.pull_request.title);

  
  setTimeout(closePullRequest.bind(null, context), 5000);
}

export function onSonarQubeWebhook(req: Request, res: Response) {
  utils.updateQualityGateStatus(req.body);
  utils.cleanWorkspace(req.body.revision);
  res.sendStatus(200);
}

function closePullRequest(context: Context<Webhooks.WebhookPayloadPullRequest>) {
  // Close the pull request to make the testing easier
  const params : {state: 'open' | 'closed'} = {
    state: 'closed'
  }
  const pullRequest = context.issue(params);
  context.github.pulls.update(pullRequest);
}