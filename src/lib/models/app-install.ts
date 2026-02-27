import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IAppInstall extends Document {
  cluster_id: Types.ObjectId;
  catalog_app_id: string;
  release_name: string;
  namespace: string;
  config_values: Record<string, unknown>;
  deploy_method: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const AppInstallSchema = new Schema<IAppInstall>(
  {
    cluster_id: { type: Schema.Types.ObjectId, ref: "Cluster", required: true },
    catalog_app_id: { type: String, required: true },
    release_name: { type: String, required: true },
    namespace: { type: String, required: true, default: "default" },
    config_values: { type: Schema.Types.Mixed, required: true, default: {} },
    deploy_method: { type: String, required: true, default: "manifest" },
    status: { type: String, required: true, default: "deploying", enum: ["deploying", "deployed", "failed", "uninstalling", "uninstalled"] },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: "app_catalog_installs" }
);

AppInstallSchema.index({ cluster_id: 1, created_at: -1 });

export const AppInstallModel =
  (mongoose.models.AppInstall as mongoose.Model<IAppInstall>) ||
  mongoose.model<IAppInstall>("AppInstall", AppInstallSchema);
