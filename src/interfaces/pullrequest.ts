import { Repository } from "./repository";

export interface PullRequest {
  head_branch: string;
  base_branch: string;
  repository: Repository;
  number: number;
}
