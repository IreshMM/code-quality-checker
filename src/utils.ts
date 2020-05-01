import { Context } from "probot";
import Webhooks from "@octokit/webhooks";
import rimraf from "rimraf";
import * as getters from "./getters";
import { EventEmitter } from "events";
import dotenv from "dotenv";
import fs from "fs";
import { ensureProjectExists } from "./sonarapi";
import { startSonarQubeScanViaJenkins, startSonarQubePRAnalyzisViaJenkins } from "./jenkinsapi";
dotenv.config();

const GIT_WORKSPACE = `${process.env.HOME}/${process.env.WORKSPACE}`;
createGitWorkspace();
const qualityGateEventEmitter = new EventEmitter();

export enum ProjectType {
  "NOTJAVA",
  "JAVA",
}

export async function determineProjectType(
  context:
    | Context<Webhooks.WebhookPayloadPush>
    | Context<Webhooks.WebhookPayloadPullRequest>
): Promise<ProjectType> {
  const lang = context.payload.repository.language;
  
  if(lang?.toLowerCase().includes('java')) {
    return ProjectType.JAVA;
  }

  return ProjectType.NOTJAVA;
}

export function cleanWorkspace(commitSha: string) {
  rimraf.sync(`${GIT_WORKSPACE}/${commitSha}`);
  console.log(`${GIT_WORKSPACE}/${commitSha} is cleaned`);
}

export function startSonarQubeScan(
  context: Context<Webhooks.WebhookPayloadPush>
) {
  setCommitStatus(context, "pending");

  const projectKey = generateProjectKey(context);
  const projectName = getters.getRepoName(context.payload);
  const gitHubRepoUrl = getters.getCloneUrl(context.payload);
  const branch = getters.getBranch(context.payload);

  ensureProjectExists(projectKey, projectName).then((success) => {
    if (success) {
      startSonarQubeScanViaJenkins(
        gitHubRepoUrl,
        branch,
        projectKey,
        (err, data) => {
          if (!err) {
            console.log(data);
            return;
          }
          console.log(err);
        }
      );
    }
  });
}

export function startSonarQubePRAnalyzis(
  context: Context<Webhooks.WebhookPayloadPullRequest>
) {
  const projectKey = generateProjectKey(context);
  const projectName = getters.getRepoName(context.payload);
  const gitHubRepoUrl = getters.getCloneUrl(context.payload);
  const baseBranch = getters.getBaseBranch(context.payload);
  const headBranch = getters.getHeadBranch(context.payload);
  const pullRequestNumber = getters.getPullRequestNumber(context.payload);
  
  console.log("Obtained details");
  ensureProjectExists(projectKey, projectName).then((success) => {
    if(success) {
      startSonarQubePRAnalyzisViaJenkins(
        gitHubRepoUrl,
        baseBranch,
        headBranch,
        pullRequestNumber,
        projectKey,
        (err, data) => {
          if(!err) {
            console.log(data);
            return;
          }
          console.log(err);
        }
      )
    }
  });
}

export function updateQualityGateStatus(payload: any) {
  const sha = payload.revision;
  const qualityGateStatus = payload.qualityGate.status;
  if (qualityGateStatus == "OK") {
    qualityGateEventEmitter.emit(`${sha}_success`);
  } else {
    qualityGateEventEmitter.emit(`${sha}_failure`);
  }
}

export function setCommitStatus(
  payloadContext: Context<Webhooks.WebhookPayloadPush>,
  commitStatus: "error" | "failure" | "pending" | "success"
) {
  console.log("setCommitStatusExectution");

  const sha = getters.getCommitSha(payloadContext.payload);
  const state = commitStatus;
  const description = "CI Test - Check quality of code";
  const context = "CODEQUALITY";

  const payload = payloadContext.repo({
    sha,
    state,
    description,
    context,
  });

  console.log(payload);
  payloadContext.github.repos.createStatus(payload);
}

export function addWebhookEventListeners(
  context: Context<Webhooks.WebhookPayloadPush>
) {
  const sha = getters.getCommitSha(context.payload);

  qualityGateEventEmitter.once(`${sha}_success`, () => {
    setCommitStatus(context, "success");
  });

  qualityGateEventEmitter.once(`${sha}_failure`, () => {
    setCommitStatus(context, "failure");
  });
}

function createGitWorkspace() {
  if (!fs.existsSync(GIT_WORKSPACE)) {
    fs.mkdirSync(GIT_WORKSPACE, { recursive: true });
  }
}

function generateProjectKey(
  context:
    | Context<Webhooks.WebhookPayloadPush>
    | Context<Webhooks.WebhookPayloadPullRequest>
) {
  return getters.getRepoName(context.payload).trim();
}