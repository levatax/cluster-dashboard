import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IDockerhubDeployment extends Document {
  cluster_id: Types.ObjectId;
  image: string;
  tag: string;
  deploy_config: Record<string, unknown>;
  release_name: string;
  namespace: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const DockerhubDeploymentSchema = new Schema<IDockerhubDeployment>(
  {
    cluster_id: { type: Schema.Types.ObjectId, ref: "Cluster", required: true },
    image: { type: String, required: true },
    tag: { type: String, required: true, default: "latest" },
    deploy_config: { type: Schema.Types.Mixed, required: true, default: {} },
    release_name: { type: String, required: true },
    namespace: { type: String, required: true, default: "default" },
    status: { type: String, required: true, default: "deploying" },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: "dockerhub_deployments" }
);

export const DockerhubDeploymentModel =
  (mongoose.models.DockerhubDeployment as mongoose.Model<IDockerhubDeployment>) ||
  mongoose.model<IDockerhubDeployment>("DockerhubDeployment", DockerhubDeploymentSchema);
