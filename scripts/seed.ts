import mongoose from "mongoose";
import { hash } from "@node-rs/argon2";

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error("ADMIN_USERNAME and ADMIN_PASSWORD are required");
  process.exit(1);
}

interface IUser {
  username: string;
  password_hash: string;
}

const UserSchema = new mongoose.Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
  },
  { collection: "users" }
);

async function seed() {
  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to MongoDB");

  const User = (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>("User", UserSchema);

  const existing = await User.findOne({ username: ADMIN_USERNAME });
  if (existing) {
    console.log(`User "${ADMIN_USERNAME}" already exists. Skipping seed.`);
  } else {
    const passwordHash = await hash(ADMIN_PASSWORD!, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    await User.create({
      username: ADMIN_USERNAME,
      password_hash: passwordHash,
    });
    console.log(`User "${ADMIN_USERNAME}" created successfully.`);
  }

  await mongoose.disconnect();
  console.log("Done.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
