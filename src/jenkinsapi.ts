import jenkins from "jenkins";

const JENKINS_HOST = process.env.JENKINS_HOST;
const JENKINS_PORT = process.env.JENKINS_PORT;
const JENKINS_LOGIN = process.env.JENKINS_LOGIN;
const JENKINS_PASS = process.env.JENKINS_PASS;

const jenkinsInstance = jenkins({
  baseUrl: `http://${JENKINS_LOGIN}:${JENKINS_PASS}@${JENKINS_HOST}:${JENKINS_PORT}`,
  crumbIssuer: true,
});

jenkinsInstance.info(console.log);

export function startSonarQubeScanViaJenkins(
  gitHubRepoUrl: string,
  projectKey: string,
  callBack?: (err: any, data: any) => void
) {}