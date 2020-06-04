import { Context } from "probot";
import { EventEmitter } from "events";
import dotenv from "dotenv";
import { ensureProjectExists } from "./sonarapi";
import {
  startSonarQubeScanViaJenkins,
  startSonarQubePRAnalyzisViaJenkins,
} from "./jenkinsapi";
import { Branch } from "./interfaces/branch";
import { Repository } from "./interfaces/repository";
import { PullRequest } from "./interfaces/pullrequest";
import { QualityGateEventPayload } from "./interfaces/qualitygateeventpayload";
dotenv.config();

const qualityGateEventEmitter = new EventEmitter();

export enum ProjectType {
  "NOTJAVA",
  "JAVA",
}

export async function determineProjectType(
  // @ts-ignore
  context: Context,
  repository: Repository
): Promise<ProjectType> {
  const repoName = repository.name;
  try {
    const { data: content } = await context.github.repos.getContents({
      owner: repository.owner,
      repo: repoName,
      path: "pom.xml",
      ref: "dev_protected",
    });

    // @ts-ignore
    const buff = new Buffer(content.content, content.encoding);
    if (buff.toString("ascii").includes("java.version")) {
      console.log(`Repo ${repoName} is identified as JAVA`);
      return ProjectType.JAVA;
    }
  } catch (err) {
    return ProjectType.NOTJAVA;
  }

  return ProjectType.NOTJAVA;
}

export function startSonarQubeScan(
  context: Context,
  repository: Repository,
  branch: Branch
) {
  setCommitStatus(
    context,
    repository,
    branch.sha,
    "pending",
    "Code quality status of this revision of the branch"
  );

  const projectKey = generateProjectKey(repository);
  const projectName = repository.name;
  const gitHubRepoUrl = repository.cloneUrl;

  ensureProjectExists(
    projectKey,
    projectName,
    generateSonarQubeProjectSettingsForGithubAssociation(repository)
  ).then((success) => {
    if (success) {
      startSonarQubeScanViaJenkins(
        gitHubRepoUrl,
        branch.name,
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
  context: Context,
  pullrequest: PullRequest
) {
  const projectKey = generateProjectKey(pullrequest.repository);
  const projectName = pullrequest.repository.name;
  const gitHubRepoUrl = pullrequest.repository.cloneUrl;
  const baseBranch = pullrequest.base_branch;
  const headBranch = pullrequest.head_branch;
  const pullRequestNumber = pullrequest.number.toString();

  console.log("Obtained details");
  ensureProjectExists(
    projectKey,
    projectName,
    generateSonarQubeProjectSettingsForGithubAssociation(context.payload)
  ).then((success) => {
    if (success) {
      startSonarQubePRAnalyzisViaJenkins(
        gitHubRepoUrl,
        baseBranch,
        headBranch,
        pullRequestNumber,
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

export function updateQualityGateStatus(payload: QualityGateEventPayload) {
  qualityGateEventEmitter.emit(payload.commit, payload);
}

export function setCommitStatus(
  payloadContext: Context,
  repository: Repository,
  sha: string,
  commitStatus: "error" | "failure" | "pending" | "success",
  description: string,
  targetUrl?: string
) {
  console.log("setCommitStatusExectution");

  const state = commitStatus;
  const context = "BranchCodeQuality";
  const target_url = targetUrl;

  const payload = {
    repo: repository.name,
    owner: repository.owner,
    sha,
    state,
    description,
    context,
    target_url,
  };

  console.log(payload);
  payloadContext.github.repos.createStatus(payload);
}

export function addWebhookEventListeners(
  context: Context,
  repository: Repository,
  sha: string
) {
  qualityGateEventEmitter.once(sha, (payload: QualityGateEventPayload) => {
    setCommitStatus(
      context,
      repository,
      sha,
      payload.status,
      payload.description,
      payload.targetUrl
    );
  });
}

function generateProjectKey(repository: Repository) {
  return repository.name.trim();
}

function generateSonarQubeProjectSettingsForGithubAssociation(
  repository: Repository
) {
  return [
    { key: "sonar.pullrequest.provider", value: "Github" },
    {
      key: "sonar.pullrequest.github.repository",
      value: `${repository.owner}/${repository.name}`,
    },
  ];
}
