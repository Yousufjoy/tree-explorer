import { MongoClient, ServerApiVersion, Db } from "mongodb";
let db: Db | undefined;

export const connectDB = async (): Promise<Db | undefined> => {
  if (db) return db;
  try {
    const uri = process.env.MONGODB_URI; // Use the server-side environment variable
    if (!uri) {
      throw new Error(
        "MongoDB connection URI is not defined in environment variables error"
      );
    }
    const client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    db = client.db("99-office");
    return db;
  } catch (error) {
    console.log({ error });
  }
};



