import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IGithubDeployment extends Document {
  cluster_id: Types.ObjectId;
  repo_url: string;
  branch: string;
  github_token: string | null;
  deploy_config: Record<string, unknown>;
  deploy_method: string;
  release_name: string;
  namespace: string;
  status: string;
  last_commit_sha: string | null;
  created_at: Date;
  updated_at: Date;
}

const GithubDeploymentSchema = new Schema<IGithubDeployment>(
  {
    cluster_id: { type: Schema.Types.ObjectId, ref: "Cluster", required: true },
    repo_url: { type: String, required: true },
    branch: { type: String, required: true, default: "main" },
    github_token: { type: String, default: null },
    deploy_config: { type: Schema.Types.Mixed, required: true, default: {} },
    deploy_method: { type: String, required: true, default: "manifest" },
    release_name: { type: String, required: true },
    namespace: { type: String, required: true, default: "default" },
    status: { type: String, required: true, default: "deploying", enum: ["deploying", "deployed", "failed"] },
    last_commit_sha: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: "github_deployments" }
);

GithubDeploymentSchema.index({ cluster_id: 1, created_at: -1 });

export const GithubDeploymentModel =
  (mongoose.models.GithubDeployment as mongoose.Model<IGithubDeployment>) ||
  mongoose.model<IGithubDeployment>("GithubDeployment", GithubDeploymentSchema);
