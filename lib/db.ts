import { MongoClient, Db } from "mongodb";
import { ensureIndexes } from "@/lib/db-indexes";

/**
 * Cached MongoDB connection.
 *
 * In dev, Next.js hot-reload re-evaluates modules on every change; caching the
 * client on `globalThis` prevents exhausting the connection pool. Mirrors the
 * pattern used by the sibling form-builder-portal so both apps behave the same.
 */
const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

if (!MONGODB_DB_NAME) {
  throw new Error("Please define the MONGODB_DB_NAME environment variable");
}

interface MongoClientCache {
  client: MongoClient | null;
  db: Db | null;
  promise: Promise<{ client: MongoClient; db: Db }> | null;
}

declare global {
  var mongoClientCache: MongoClientCache | undefined;
}

const cached: MongoClientCache = global.mongoClientCache || {
  client: null,
  db: null,
  promise: null,
};

if (!global.mongoClientCache) {
  global.mongoClientCache = cached;
}

export async function connectToDatabase(): Promise<{
  client: MongoClient;
  db: Db;
}> {
  if (cached.client && cached.db) {
    return { client: cached.client, db: cached.db };
  }

  if (!cached.promise) {
    // Index creation is folded into the connect promise so it runs exactly once
    // per process, as part of "becoming connected" — every later caller (incl.
    // the early-return above) is then guaranteed to see an indexed DB.
    // `ensureIndexes` swallows its own errors, so it can't break the connection.
    cached.promise = MongoClient.connect(MONGODB_URI, {
      // Serverless (Vercel) scales by spinning up many instances, each with its
      // own pool. A large pool per instance multiplies fast and exhausts Atlas's
      // connection limit, so keep it small and let idle connections close.
      maxPoolSize: 10,
      minPoolSize: 0,
    }).then(async (client) => {
      const db = client.db(MONGODB_DB_NAME);
      await ensureIndexes(db);
      return { client, db };
    });
  }

  const { client, db } = await cached.promise;
  cached.client = client;
  cached.db = db;

  return { client, db };
}

export async function getDb(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

export async function getClient(): Promise<MongoClient> {
  const { client } = await connectToDatabase();
  return client;
}
