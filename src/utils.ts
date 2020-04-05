import { Context } from "probot";
import Webhooks from '@octokit/webhooks';

export enum ProjectType { 'IIB', 'JAVA' };

export function determineProjectType(context: Context<Webhooks.WebhookPayloadPush>): ProjectType {
    return ProjectType.JAVA;
}

export async function startJenkinsSonarJob(context: Context<Webhooks.WebhookPayloadPush>) {
    
}