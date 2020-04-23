import jenkins from "jenkins";

const JENKINS_HOST = process.env.JENKINS_HOST;
const JENKINS_PORT = process.env.JENKINS_PORT;
const JENKINS_LOGIN = process.env.JENKINS_LOGIN;
const JENKINS_PASS = process.env.JENKINS_PASS;
const JENKINS_PROJECT = process.env.JENKINS_PROJECT;
const JENKINS_SUBPATH = process.env.JENKINS_SUBPATH;

const JENKINS_ACCESS_URL = `http://${JENKINS_LOGIN}:${JENKINS_PASS}@${JENKINS_HOST}:${JENKINS_PORT}/${JENKINS_SUBPATH ? JENKINS_SUBPATH : ''}`;

const jenkinsInstance = jenkins({
  baseUrl: JENKINS_ACCESS_URL,
  crumbIssuer: true,
});

export function startSonarQubeScanViaJenkins(
  gitHubRepoUrl: string,
  branch: string,
  sonarProjectKey: string,
  callBack?: (err: Error, data: any) => void
) {
  jenkinsInstance.job.build(
    {
      name: `${JENKINS_PROJECT}`,
      parameters: {
        gitHubRepoUrl,
        branch,
        sonarProjectKey,
      },
    },
    callBack ? callBack : console.log
  );
}
