import mongoose from "mongoose";

const globalWithMongoose = globalThis as typeof globalThis & {
  _mongoosePromise?: Promise<typeof mongoose>;
};

export async function connectDB(): Promise<typeof mongoose> {
  if (globalWithMongoose._mongoosePromise) {
    return globalWithMongoose._mongoosePromise;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Please define the MONGODB_URI environment variable");
  }

  globalWithMongoose._mongoosePromise = mongoose.connect(uri).catch((err) => {
    globalWithMongoose._mongoosePromise = undefined;
    throw err;
  });
  return globalWithMongoose._mongoosePromise;
}
