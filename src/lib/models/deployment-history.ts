import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IDeploymentHistory extends Document {
  cluster_id: Types.ObjectId;
  source_type: string;
  source_id: string | null;
  action: string;
  release_name: string;
  namespace: string;
  status: string;
  details: Record<string, unknown>;
  created_at: Date;
}

const DeploymentHistorySchema = new Schema<IDeploymentHistory>(
  {
    cluster_id: { type: Schema.Types.ObjectId, ref: "Cluster", required: true },
    source_type: { type: String, required: true },
    source_id: { type: String, default: null },
    action: { type: String, required: true },
    release_name: { type: String, required: true },
    namespace: { type: String, required: true, default: "default" },
    status: { type: String, required: true },
    details: { type: Schema.Types.Mixed, required: true, default: {} },
    created_at: { type: Date, default: Date.now },
  },
  { collection: "deployment_history" }
);

export const DeploymentHistoryModel =
  (mongoose.models.DeploymentHistory as mongoose.Model<IDeploymentHistory>) ||
  mongoose.model<IDeploymentHistory>("DeploymentHistory", DeploymentHistorySchema);
