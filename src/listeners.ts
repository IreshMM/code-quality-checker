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

  const branch = context.payload.ref.split('/')[2];
  utils
    .determineProjectType(context, repository, branch)
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
    });
}

export async function onInstallation(
  context: Context<Webhooks.WebhookPayloadInstallation>
) {
  const repositories = context.payload.repositories;

  for (let i = 0; i < repositories.length; i++) {
    const repo = repositories[i];

    const repository: Repository = {
      name: repo.name,
      owner: context.payload.installation.account.login,
      cloneUrl: `https://github.com/${repo.full_name}`,
      language: null,
    };

    utils
      .determineProjectType(context, repository)
      .then((projectType: utils.ProjectType) => {
        if (projectType == utils.ProjectType.JAVA) {
          console.log("insideProjectTypeJava");

          context.github.repos
            .getCommit({
              owner: repository.owner,
              repo: repository.name,
              ref: process.env.SONARQUBE_DEFAULT_BRANCH!,
            })
            .then((commitPayload) => {
              const branch: Branch = {
                name: process.env.SONARQUBE_DEFAULT_BRANCH!,
                // @ts-ignore
                sha: commitPayload.data.sha,
              };

              utils.addWebhookEventListeners(context, repository, branch.sha);
              utils.startSonarQubeScan(context, repository, branch);
              // @ts-ignore
            }).catch(err => {
              console.log(`Repo ${repository.name} probably doesn't have dev_protected branch.`);
            });
        }
      });
  }
}

export function onSonarQubeWebhook(req: Request, res: Response) {
  utils.updateQualityGateStatus(req.body);
  res.sendStatus(200);
}
