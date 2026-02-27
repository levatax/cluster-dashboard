import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface IRefreshToken extends Document {
  user_id: Types.ObjectId;
  token_hash: string;
  family: string;
  expires_at: Date;
  used: boolean;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token_hash: { type: String, required: true },
    family: { type: String, required: true },
    expires_at: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { collection: "refresh_tokens" }
);

RefreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
RefreshTokenSchema.index({ family: 1 });

export const RefreshTokenModel =
  (mongoose.models.RefreshToken as mongoose.Model<IRefreshToken>) ||
  mongoose.model<IRefreshToken>("RefreshToken", RefreshTokenSchema);
