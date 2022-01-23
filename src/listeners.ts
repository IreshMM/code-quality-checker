import { Context } from "probot";
import Webhooks from "@octokit/webhooks";
import * as utils from "./utils";
import { Request, Response } from "express";
import { Repository } from "./interfaces/repository";
import { Branch } from "./interfaces/branch";
import { PullRequest } from "./interfaces/pullrequest";
import { QualityGateEventPayload } from "./interfaces/qualitygateeventpayload";
import { addWebHookIfNotExists } from "./sonarapi";

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

// This is triggered when the app is first installed on an organization
export async function onInstallation(
  context: Context<Webhooks.WebhookPayloadInstallation>
) {
  const repositories = context.payload.repositories;
  await addWebHookIfNotExists();

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
            })
            // @ts-ignore
            .catch((err) => {
              console.log(
                `Repo ${repository.name} probably doesn't have dev_protected branch.`
              );
            });
        }
      });
  }
}

export function onSonarQubeWebhook(req: Request, res: Response) {
  const eventPayload: QualityGateEventPayload = {
    commit: req.body.revision,
    status: req.body.qualityGate.status == "OK" ? "success" : "failure",
    description: "Code quality status of this revision of the branch",
    targetUrl: req.body.branch.url,
  };
  utils.updateQualityGateStatus(eventPayload);
  res.sendStatus(200);
}

export function onJenkinsWebhook(req: Request, res: Response) {
  console.log(req.body.status);
  if (req.body.status == "failure") {
    console.log("Inside failure");
    const eventPayload: QualityGateEventPayload = {
      commit: req.body.git_commit,
      description: "Jenkins SonarQube Trigger: Build Failed",
      status: "error",
      targetUrl: `${req.body.build_url}/console`,
    };
    utils.updateQualityGateStatus(eventPayload);
  }
  console.log(req.body);
  res.sendStatus(200);
}
