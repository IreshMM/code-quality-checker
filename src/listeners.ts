import { Context } from "probot";
import Webhooks from "@octokit/webhooks";
import * as utils from "./utils";

export async function onPush(context: Context<Webhooks.WebhookPayloadPush>) {
  if (utils.determineProjectType(context) === utils.ProjectType.JAVA) {
    utils.startJenkinsSonarJob(context);
  }
}
