import {
  WebhookPayloadPush,
  WebhookPayloadPullRequest,
} from "@octokit/webhooks";

export function getCommitSha(payload: any): string {
  if(payload.head_commit) return payload.head_commit.id;
  const typedPayload: WebhookPayloadPullRequest = payload;
  return typedPayload.pull_request.head.sha;
}

export function getBranch(
  payload: WebhookPayloadPush | WebhookPayloadPullRequest
) {
  if ("ref" in payload) {
    const ref = getRef(payload);
    return ref.split("/")[2];
  }
  return getHeadBranch(payload);
}

export function getRef(payload: WebhookPayloadPush) {
  return payload.ref;
}

export function getCloneUrl(
  payload: WebhookPayloadPush | WebhookPayloadPullRequest
) {
  return payload.repository.clone_url;
}

export function getRepoName(
  payload: WebhookPayloadPush | WebhookPayloadPullRequest
) {
  return payload.repository.name;
}

export function getOwner(
  payload: WebhookPayloadPush | WebhookPayloadPullRequest
) {
  if(payload.repository.owner.name) return payload.repository.owner.name;
  return payload.repository.owner.login;
}

export function getHeadRef(payload: WebhookPayloadPullRequest) {
  return payload.pull_request.head.ref;
}

export function getBaseRef(payload: WebhookPayloadPullRequest) {
  return payload.pull_request.base.ref;
}

export function getHeadBranch(payload: WebhookPayloadPullRequest) {
  const ref = getHeadRef(payload);
  return ref;
}

export function getBaseBranch(payload: WebhookPayloadPullRequest) {
  const ref = getBaseRef(payload);
  return ref;
}

export function getPullRequestNumber(payload: WebhookPayloadPullRequest) {
  return payload.pull_request.number.toString();
}
