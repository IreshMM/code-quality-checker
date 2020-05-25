import { Context } from "probot";
import Webhooks from "@octokit/webhooks";
import * as utils from "./utils";
import { Request, Response } from "express";
import { Repository } from "./interfaces/repository";
import { Branch } from "./interfaces/branch";
import { PullRequest } from "./interfaces/pullrequest";

export async function onPush(context: Context<Webhooks.WebhookPayloadPush>) {
  console.log("onPushExecution");

  const repository: Repository = {
    name: context.payload.repository.name,
    owner: context.payload.repository.owner.login,
    cloneUrl: context.payload.repository.clone_url,
    language: context.payload.repository.language,
  };

  utils
    .determineProjectType(context, repository)
    .then((projectType: utils.ProjectType) => {
      if (projectType == utils.ProjectType.JAVA) {
        console.log("insideProjectTypeJava");

        const branch: Branch = {
          name: context.payload.ref.split("/")[2],
          // @ts-ignore
          sha: context.payload.head_commit.id,
        };

        utils.addWebhookEventListeners(context, repository, branch.sha);
        utils.startSonarQubeScan(context, repository, branch);
      }
    });
}

export async function onPullRequest(
  context: Context<Webhooks.WebhookPayloadPullRequest>
) {
  console.log("PullRequestCreationDetected");
  const repository: Repository = {
    name: context.payload.repository.name,
    owner: context.payload.repository.owner.login,
    cloneUrl: context.payload.repository.clone_url,
    language: context.payload.repository.language,
  };
  utils
    .determineProjectType(context, repository)
    .then((projectType: utils.ProjectType) => {
      if (projectType == utils.ProjectType.JAVA) {
        console.log("InsideProjectTypeJavaFromPullRequest");

        const pullRequest: PullRequest = {
          base_branch: context.payload.pull_request.base.ref,
          head_branch: context.payload.pull_request.head.ref,
          number: context.payload.pull_request.number,
          repository: repository,
        };
        utils.startSonarQubePRAnalyzis(context, pullRequest);
      }
}

export function onSonarQubeWebhook(req: Request, res: Response) {
  utils.updateQualityGateStatus(req.body);
  res.sendStatus(200);
}
