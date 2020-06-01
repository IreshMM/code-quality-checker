export interface QualityGateEventPayload {
    commit: string;
    status: "failure" | "pending" | "success" | "error";
    description: string;
    targetUrl: string;
}