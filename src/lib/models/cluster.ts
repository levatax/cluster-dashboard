import mongoose, { Schema, type Document } from "mongoose";
import { AlertConfigModel } from "./alert-config";
import { AppInstallModel } from "./app-install";
import { GithubDeploymentModel } from "./github-deployment";
import { DeploymentHistoryModel } from "./deployment-history";
import { DockerhubDeploymentModel } from "./dockerhub-deployment";

export interface ICluster extends Document {
  name: string;
  server: string;
  kubeconfig_yaml: string;
  created_at: Date;
  last_connected_at: Date | null;
  registry_url: string | null;
}

const ClusterSchema = new Schema<ICluster>(
  {
    name: { type: String, required: true },
    server: { type: String, required: true },
    kubeconfig_yaml: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
    last_connected_at: { type: Date, default: null },
    registry_url: { type: String, default: null },
  },
  { collection: "clusters" }
);

ClusterSchema.pre("findOneAndDelete", async function () {
  const doc = await this.model.findOne(this.getFilter());
  if (!doc) return;
  const id = doc._id;
  const results = await Promise.allSettled([
    AlertConfigModel.deleteMany({ cluster_id: id }),
    AppInstallModel.deleteMany({ cluster_id: id }),
    GithubDeploymentModel.deleteMany({ cluster_id: id }),
    DeploymentHistoryModel.deleteMany({ cluster_id: id }),
    DockerhubDeploymentModel.deleteMany({ cluster_id: id }),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Cascade delete failed for cluster", id.toString(), result.reason);
    }
  }
});

export const ClusterModel =
  (mongoose.models.Cluster as mongoose.Model<ICluster>) ||
  mongoose.model<ICluster>("Cluster", ClusterSchema);
