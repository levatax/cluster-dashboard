import mongoose, { Schema, type Document } from "mongoose";

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
  const m = mongoose.models;
  await Promise.all([
    m.AlertConfig?.deleteMany({ cluster_id: id }),
    m.AppInstall?.deleteMany({ cluster_id: id }),
    m.GithubDeployment?.deleteMany({ cluster_id: id }),
    m.DeploymentHistory?.deleteMany({ cluster_id: id }),
    m.DockerhubDeployment?.deleteMany({ cluster_id: id }),
  ]);
});

export const ClusterModel =
  (mongoose.models.Cluster as mongoose.Model<ICluster>) ||
  mongoose.model<ICluster>("Cluster", ClusterSchema);
