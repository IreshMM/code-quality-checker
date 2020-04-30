import {
  WebhookPayloadPush,
  WebhookPayloadPullRequest,
} from "@octokit/webhooks";

export function getCommitSha(payload: any): string {
  return payload.head_commit.id;
}

export function getBranch(
  payload: WebhookPayloadPush | WebhookPayloadPullRequest
) {
  const ref = getRef(payload);
  return ref.split("/")[2];
}

export function getRef(
  payload: WebhookPayloadPush | WebhookPayloadPullRequest
) {
  if ("ref" in payload) {
    return payload.ref;
  } else {
    return payload.pull_request.head.ref;
  }
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
  return payload.repository.owner.name;
}