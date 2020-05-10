import fetch from "node-fetch";

const SONAR_LOGIN = process.env.SONAR_LOGIN;
const SONARQUBE_URL = process.env.SONARQUBE_URL;
const BASE_URL = process.env.BASE_URL;
const SONARQUBE_WEBHOOK_NAME = process.env.SONARQUBE_WEBHOOK_NAME;
const SONARQUBE_WEBHOOK_SECRET = process.env.SONARQUBE_WEBHOOK_SECRET!;

const apiBaseUrl = `${SONARQUBE_URL}/api`;
const encodedToken = new Buffer(SONAR_LOGIN + ":").toString("base64");
const encodedWebhookSecret = new Buffer(SONARQUBE_WEBHOOK_SECRET).toString("base64");
const encodedWebhookUrl = new Buffer(`${BASE_URL}/webhooks/sonarqube`).toString();

export async function projectExists(projectKey: string) {
  const res = await fetch(
    `${apiBaseUrl}/projects/search?projects=${projectKey}`,
    {
      method: "post",
      headers: { Authorization: `Basic ${encodedToken}` },
    }
  ).then((res) => res.json());

  if (res.components.length > 0) return true;
  return false;
}

export async function createProject(name: string, project: string) {
  const res = await fetch(
    `${apiBaseUrl}/projects/create?name=${name}&project=${project}`,
    {
      method: "post",
      headers: { Authorization: `Basic ${encodedToken}` },
    }
  ).then((res) => res.json());

  if (res.project) return true;
  return false;
}

export async function ensureProjectExists(projectKey: string, name: string) {
  if(!await projectExists(projectKey)) {
    return await createProject(name, projectKey);
  }
  return true;
}

export async function addWebHookIfNotExists() {
  if(!await webHookExists()) {
    await createWebHook();
  }
}

async function webHookExists() {
  const res = await fetch(
    `${apiBaseUrl}/webhooks/list`,
    {
      method: "post",
      headers: { Authorization: `Basic ${encodedToken}` },
    }
  ).then((res) => res.json());

  if(res.webhooks.length > 0) {
    for (let webhook of res.webhooks) {
      if(webhook.name == SONARQUBE_WEBHOOK_NAME) {
        return true;
      }
    }
    return false;
  }
  return false;
}

async function createWebHook() {
  const res = await fetch(
    `${apiBaseUrl}/webhooks/create?name=${SONARQUBE_WEBHOOK_NAME}&secret=${encodedWebhookSecret}&url=${encodedWebhookUrl}`,
    {
      method: "post",
      headers: { Authorization: `Basic ${encodedToken}` },
    }
  ).then((res) => res.json());

  if(res.webhook) {
    return true;
  }
  return false;
}