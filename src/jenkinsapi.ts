import jenkins from "jenkins";
import fs from "fs";

const JENKINS_HOST = process.env.JENKINS_HOST;
const JENKINS_PORT = process.env.JENKINS_PORT;
const JENKINS_LOGIN = process.env.JENKINS_LOGIN;
const JENKINS_PASS = process.env.JENKINS_PASS;
const JENKINS_PROJECT = process.env.JENKINS_PROJECT || "JavaCodeQualityChecker";
const JENKINS_SUBPATH = process.env.JENKINS_SUBPATH;
const JENKINS_CONFIG_COMMIT_STATUSES = process.env.JENKINS_CONFIG_COMMIT_STATUSES || 'job.xml';
const JENKINS_CONFIG_PULL_REQUEST = process.env.JENKINS_CONFIG_PULL_REQUEST;

const JENKINS_ACCESS_URL = `http://${JENKINS_LOGIN}:${JENKINS_PASS}@${JENKINS_HOST}:${JENKINS_PORT}/${
  JENKINS_SUBPATH ? JENKINS_SUBPATH : ""
}`;

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
  ensureJobExistsAndContinue(JENKINS_CONFIG_COMMIT_STATUSES, JENKINS_PROJECT, () => {
    jenkinsInstance.job.build(
      {
        name: JENKINS_PROJECT,
        parameters: {
          gitHubRepoUrl,
          branch,
          sonarProjectKey,
        },
      },
      callBack ? callBack : console.log
    );
  });
}

export function ensureJobExistsAndContinue(
  jobConfigFile: string,
  projectName: string,
  continueCallBack: () => void
) {
  console.log('ensureJobExistsAndContinueExecution');
  
  jenkinsInstance.job.exists(projectName, (error, exists) => {
    if (!exists && !error) {
      console.log('JobDoesNotExist');
      
      createJob(jobConfigFile, projectName, (created) => {
        if (created) {
          continueCallBack();
        }
      });
    } else {
      continueCallBack();
    }
  });
}

function createJob(jobConfigFile: string, projectName: string, callBack: (created: Boolean) => void) {
  fs.readFile(`./jobconfig/${jobConfigFile}`, "utf8", (err, data) => {
    if (!err) {
      jenkinsInstance.job.create(projectName, data, (err) => {
        if (!err) {
          console.log("job created");
          callBack(true);
        }
      });
    }
  });
}