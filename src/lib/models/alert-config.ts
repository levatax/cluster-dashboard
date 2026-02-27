import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IAlertConfig extends Document {
  cluster_id: Types.ObjectId;
  metric: string;
  warning_threshold: number;
  critical_threshold: number;
  enabled: boolean;
}

const AlertConfigSchema = new Schema<IAlertConfig>(
  {
    cluster_id: { type: Schema.Types.ObjectId, ref: "Cluster", required: true },
    metric: { type: String, required: true },
    warning_threshold: { type: Number, required: true, default: 70 },
    critical_threshold: { type: Number, required: true, default: 85 },
    enabled: { type: Boolean, required: true, default: true },
  },
  { collection: "alert_configs" }
);

AlertConfigSchema.index({ cluster_id: 1, metric: 1 }, { unique: true });

export const AlertConfigModel =
  (mongoose.models.AlertConfig as mongoose.Model<IAlertConfig>) ||
  mongoose.model<IAlertConfig>("AlertConfig", AlertConfigSchema);
