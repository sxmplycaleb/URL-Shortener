import dotenv from "dotenv";

import { connectDatabase, disconnectDatabase } from "../config/database.js";
import Click from "../models/Click.js";
import RefreshToken from "../models/RefreshToken.js";
import URLModel from "../models/URL.js";
import User from "../models/User.js";

dotenv.config();

const now = Date.now();

async function seed() {
  await connectDatabase();

  await Promise.all([Click.deleteMany({}), URLModel.deleteMany({}), RefreshToken.deleteMany({}), User.deleteMany({})]);

  const users = await User.create([
    {
      name: "Demo User",
      email: "demo@example.com",
      password: "Password123",
      isVerified: true,
    },
    {
      name: "Admin User",
      email: "admin@example.com",
      password: "AdminPass123",
      role: "admin",
      isVerified: true,
    },
  ]);

  const urls = await URLModel.create([
    {
      originalUrl: "https://www.mongodb.com/docs/",
      shortCode: "mongo01",
      customAlias: "mongodb-docs",
      user: users[0]._id,
      expiresAt: new Date(now + 1000 * 60 * 60 * 24 * 30),
    },
    {
      originalUrl: "https://mongoosejs.com/docs/",
      shortCode: "mongoose",
      customAlias: "mongoose-docs",
      user: users[0]._id,
    },
    {
      originalUrl: "https://react.dev/",
      shortCode: "react19",
      user: users[1]._id,
    },
  ]);

  await Click.create([
    {
      url: urls[0]._id,
      visitorIp: "203.0.113.10",
      browser: "Chrome",
      operatingSystem: "Windows",
      device: "Desktop",
      country: "United States",
      city: "New York",
      referrer: "https://google.com",
      clickedAt: new Date(now - 1000 * 60 * 15),
    },
    {
      url: urls[0]._id,
      visitorIp: "198.51.100.24",
      browser: "Safari",
      operatingSystem: "iOS",
      device: "Mobile",
      country: "Kenya",
      city: "Nairobi",
      referrer: "https://example.com",
      clickedAt: new Date(now - 1000 * 60 * 5),
    },
    {
      url: urls[1]._id,
      visitorIp: "192.0.2.44",
      browser: "Firefox",
      operatingSystem: "Linux",
      device: "Desktop",
      country: "Canada",
      city: "Toronto",
      clickedAt: new Date(now - 1000 * 60),
    },
  ]);

  await URLModel.bulkWrite([
    { updateOne: { filter: { _id: urls[0]._id }, update: { $inc: { clickCount: 2 } } } },
    { updateOne: { filter: { _id: urls[1]._id }, update: { $inc: { clickCount: 1 } } } },
  ]);

  await RefreshToken.create({
    user: users[0]._id,
    tokenHash: "demo-refresh-token",
    expiresAt: new Date(now + 1000 * 60 * 60 * 24 * 7),
  });

  console.log(`Seeded ${users.length} users, ${urls.length} URLs, and sample click analytics.`);
}

seed()
  .catch((error) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
