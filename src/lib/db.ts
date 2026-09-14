import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://pds_admin:PdsAdmin2026SecretKey!@ac-ffemcue-shard-00-00.oddnrse.mongodb.net:27017,ac-ffemcue-shard-00-01.oddnrse.mongodb.net:27017,ac-ffemcue-shard-00-02.oddnrse.mongodb.net:27017/auth_db?ssl=true&authSource=admin&replicaSet=atlas-a3jm8b-shard-0&retryWrites=true&w=majority';
const dbName = process.env.MONGODB_DB || 'auth_db';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(dbName);
}
