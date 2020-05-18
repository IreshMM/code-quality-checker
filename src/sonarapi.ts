import fetch from "node-fetch";

const BASE_URL = process.env.BASE_URL;

const SONAR_LOGIN = process.env.SONAR_LOGIN;
const SONARQUBE_URL = process.env.SONARQUBE_URL;
const SONARQUBE_WEBHOOK_NAME = process.env.SONARQUBE_WEBHOOK_NAME;
const SONARQUBE_WEBHOOK_SECRET = process.env.SONARQUBE_WEBHOOK_SECRET!;
const SONARQUBE_DEFAULT_BRANCH = process.env.SONARQUBE_DEFAULT_BRANCH!;

const apiBaseUrl = `${SONARQUBE_URL}/api`;
const encodedToken = new Buffer(SONAR_LOGIN + ":").toString("base64");
const encodedWebhookSecret = new Buffer(SONARQUBE_WEBHOOK_SECRET).toString(
  "base64"
);
const encodedWebhookUrl = new Buffer(
  `${BASE_URL}/webhooks/sonarqube`
).toString();

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

export async function ensureProjectExists(
  projectKey: string,
  name: string,
  settings?: { key: string; value: string }[]
) {
  if (!(await projectExists(projectKey))) {
    return await createProject(name, projectKey).then(async (success) => {
      if (success && settings) {
        await setDefaultBranch(projectKey, SONARQUBE_DEFAULT_BRANCH);
        return await setSettings(projectKey, settings);
      }
      return false;
    });
  }
  return true;
}

export async function addWebHookIfNotExists() {
  if (!(await webHookExists())) {
    await createWebHook();
  }
}

async function webHookExists() {
  const res = await fetch(`${apiBaseUrl}/webhooks/list`, {
    method: "post",
    headers: { Authorization: `Basic ${encodedToken}` },
  }).then((res) => res.json());

  if (res.webhooks.length > 0) {
    for (let webhook of res.webhooks) {
      if (webhook.name == SONARQUBE_WEBHOOK_NAME) {
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

  if (res.webhook) {
    return true;
  }
  return false;
}

async function setProperty(component: string, key: string, value: string) {
  const statusCode = await fetch(
    `${apiBaseUrl}/settings/set?component=${component}&key=${key}&value=${value}`,
    {
      method: "post",
      headers: { Authorization: `Basic ${encodedToken}` },
    }
  ).then((res) => res.status);

  if (statusCode == 204) return true;
  return false;
}

async function setSettings(
  project: string,
  settings: { key: string; value: string }[]
) {
  settings.forEach((property) => {
    setProperty(project, property.key, property.value);
  });
  return true;
}

async function setDefaultBranch(project: string, branch: string) {
  const res = await fetch(
    `${apiBaseUrl}/project_branches/rename?name=${branch}&project=${project}`,
    {
      method: "post",
      headers: { Authorization: `Basic ${encodedToken}` },
    }
  );

  if (res.status == 204) return true;
  return false;
}
