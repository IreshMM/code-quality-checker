import fetch from "node-fetch";

const apiBaseUrl = `${process.env.SONARQUBE_URL}/api`;
const token = process.env.SONAR_LOGIN;
const encodedToken = new Buffer(token + ":").toString("base64");

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