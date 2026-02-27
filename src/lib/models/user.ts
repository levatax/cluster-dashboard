import mongoose, { Schema, type Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  password_hash: string;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
  },
  { collection: "users" }
);

export const UserModel =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);
