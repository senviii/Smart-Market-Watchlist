import mongoose from "mongoose";

async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017/smart-watchlist";
  await mongoose.connect(uri);
  console.log("[db] connected to MongoDB");
}

export default connectDB;
