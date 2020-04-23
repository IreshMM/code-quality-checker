import { Context } from "probot";
import Webhooks from "@octokit/webhooks";
import rimraf from "rimraf";
import * as getters from "./getters";
import { EventEmitter } from "events";
import simpleGit from "simple-git/promise";
import dotenv from "dotenv";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { ensureProjectExists } from "./sonarapi";
import { startSonarQubeScanViaJenkins } from "./jenkinsapi";
const promisifiedExec = promisify(exec);
dotenv.config();

const GIT_WORKSPACE = `${process.env.HOME}/${process.env.WORKSPACE}`;
createGitWorkspace();
const gitWorkspace = simpleGit(GIT_WORKSPACE);
const qualityGateEventEmitter = new EventEmitter();

export enum ProjectType {
  "NOTJAVA",
  "JAVA",
}

export async function determineProjectType(
  context: Context<Webhooks.WebhookPayloadPush>
): Promise<ProjectType> {
  if (context) {
    const repoName = getters.getRepoName(context.payload);
    if (repoName.toLocaleLowerCase().includes("java")) {
      return ProjectType.JAVA;
    }

    await cleanWorkspace(getters.getCommitSha(context.payload));
    await cloneCommit(context.payload);

    const gitRepoPath = `${GIT_WORKSPACE}/${getters.getCommitSha(
      context.payload
    )}`;
    try {
      const { stdout, stderr } = await promisifiedExec(
        `bash lib/determineprojecttype.sh ${gitRepoPath}`
      );
      if (stdout.includes("JAVA")) {
        console.log("Project type java identified");

        return ProjectType.JAVA;
      }
      console.log(stderr);
    } catch (error) {
      console.log(error);
    }
  }
  console.log("ProjectType: NOTJAVA");

  return ProjectType.NOTJAVA;
}

export function cleanWorkspace(commitSha: string) {
  rimraf.sync(`${GIT_WORKSPACE}/${commitSha}`);
  console.log(`${GIT_WORKSPACE}/${commitSha} is cleaned`);
}

export async function cloneCommit(payload: Webhooks.WebhookPayloadPush) {
  console.log("cloneCommitExecution");
  const GITHUB_LOGIN = process.env.GITHUB_LOGIN;
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

  let remoteUrl;
  if (GITHUB_LOGIN && GITHUB_TOKEN) {
    const repoOwner = getters.getOwner(payload);
    const repoName = getters.getRepoName(payload);
    remoteUrl = `https://${GITHUB_LOGIN}:${GITHUB_TOKEN}@github.com/${repoOwner}/${repoName}`;
  } else {
    remoteUrl = getters.getCloneUrl(payload);
  }

  const branch = getters.getBranch(payload);
  const sha = getters.getCommitSha(payload);
  await gitWorkspace.clone(remoteUrl, sha, [
    "--single-branch",
    `--branch=${branch}`,
    "--depth=1",
  ]);
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

function generateProjectKey(context: Context<Webhooks.WebhookPayloadPush>) {
  return getters.getRepoName(context.payload).trim();
}
