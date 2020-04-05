import { Context } from "probot";
import Webhooks from "@octokit/webhooks";
import rimraf from "rimraf";
import * as getters from "./getters";
import { EventEmitter } from "events";
import simpleGit from "simple-git/promise";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const GIT_WORKSPACE = `${process.env.HOME}/${process.env.WORKSPACE}`;
createGitWorkspace();
const gitWorkspace = simpleGit(GIT_WORKSPACE);
const qualityGateEventEmitter = new EventEmitter();

export enum ProjectType {
  "IIB",
  "JAVA",
}

export function determineProjectType(
  context: Context<Webhooks.WebhookPayloadPush>
): ProjectType {
  if (context) {
    return ProjectType.JAVA;
  }
  return ProjectType.IIB;
}

export function cleanWorkspace(commitSha: string) {
  rimraf.sync(`${GIT_WORKSPACE}/${commitSha}`);
  console.log(`${GIT_WORKSPACE}/${commitSha} is cleaned`);
}

export async function cloneCommit(payload: Webhooks.WebhookPayloadPush) {
  console.log("cloneCommitExecution");
  
  const cloneUrl = getters.getCloneUrl(payload);
  const branch = getters.getBranch(payload);
  const sha = getters.getCommitSha(payload);
  await gitWorkspace.clone(cloneUrl, sha, [
    "--single-branch",
    `--branch=${branch}`,
    "--depth=1",
  ]);
}

export function startSonarQubeScan(
  context: Context<Webhooks.WebhookPayloadPush>
) {
  setCommitStatus(context, "pending");

  const commitSha = getters.getCommitSha(context.payload);
  const mvn = require("maven").create({
    cwd: `${GIT_WORKSPACE}/${commitSha}`,
  });

  mvn
    .execute(["clean", "install", "sonar:sonar"], {
      skipTests: true,
      "sonar.projectKey": "spring-test-jenkins",
      "sonar.host.url": process.env.SONARQUBE_URL,
      "sonar.login": process.env.SONAR_LOGIN
    })
    .then(() => {
      console.log("done");
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
    setCommitStatus(context, "success");
  });
}

function createGitWorkspace() {
  if (!fs.existsSync(GIT_WORKSPACE)) {
    fs.mkdirSync(GIT_WORKSPACE, { recursive: true });
  }
}
