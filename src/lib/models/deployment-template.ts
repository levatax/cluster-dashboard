import mongoose, { Schema, type Document } from "mongoose";

export interface IDeploymentTemplate extends Document {
  name: string;
  description: string | null;
  source_type: string;
  config: Record<string, unknown>;
  catalog_app_id: string | null;
  created_at: Date;
  updated_at: Date;
}

const DeploymentTemplateSchema = new Schema<IDeploymentTemplate>(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    source_type: { type: String, required: true },
    config: { type: Schema.Types.Mixed, required: true },
    catalog_app_id: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { collection: "deployment_templates" }
);

export const DeploymentTemplateModel =
  (mongoose.models.DeploymentTemplate as mongoose.Model<IDeploymentTemplate>) ||
  mongoose.model<IDeploymentTemplate>("DeploymentTemplate", DeploymentTemplateSchema);
