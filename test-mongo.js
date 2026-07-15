import "dotenv/config";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);

try {
  await client.connect();
  console.log("✅ Connected successfully!");
  console.log(await client.db().admin().ping());
} catch (err) {
  console.error("❌ Connection failed:");
  console.error(err);
} finally {
  await client.close();
}