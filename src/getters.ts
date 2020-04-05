import { WebhookPayloadPush } from "@octokit/webhooks";

export function getCommitSha(payload: any) {
  return payload.head_commit.id;
}

export function getBranch(payload: WebhookPayloadPush) {
  const ref = getRef(payload);
  return ref.split("/")[2];
}

export function getRef(payload: WebhookPayloadPush) {
  return payload.ref;
}

export function getCloneUrl(payload: WebhookPayloadPush) {
  return payload.repository.clone_url;
}

export function getRepoName(payload: WebhookPayloadPush) {
  return payload.repository.name;
}

export function getOwner(payload: WebhookPayloadPush) {
  return payload.repository.owner.name;
}