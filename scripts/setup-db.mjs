import { MongoClient } from 'mongodb';

const uri = 'mongodb://pds_admin:PdsAdmin2026SecretKey!@ac-ffemcue-shard-00-00.oddnrse.mongodb.net:27017,ac-ffemcue-shard-00-01.oddnrse.mongodb.net:27017,ac-ffemcue-shard-00-02.oddnrse.mongodb.net:27017/auth_db?ssl=true&authSource=admin&replicaSet=atlas-a3jm8b-shard-0&retryWrites=true&w=majority';

async function main() {
  console.log('Connecting to MongoDB Atlas Cluster0...');
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected successfully to MongoDB Atlas!');

    // List all databases
    const adminDb = client.db().admin();
    const dbs = await adminDb.listDatabases();
    console.log('Existing databases on cluster:', dbs.databases.map(d => d.name));

    // If there is any non-system database to clean up or old database:
    for (const d of dbs.databases) {
      if (!['admin', 'local', 'config'].includes(d.name) && d.name !== 'auth_db') {
        console.log(`Dropping old database: ${d.name}...`);
        await client.db(d.name).dropDatabase();
        console.log(`Dropped ${d.name}.`);
      }
    }

    // Set up auth_db
    const authDb = client.db('auth_db');
    
    // Ensure 'users' collection exists and create unique index on email
    console.log('Creating/verifying users collection...');
    const usersCol = authDb.collection('users');
    await usersCol.createIndex({ email: 1 }, { unique: true });
    
    // Ensure 'session_logs' collection exists and create index on userId and createdAt
    console.log('Creating/verifying session_logs collection...');
    const sessionLogsCol = authDb.collection('session_logs');
    await sessionLogsCol.createIndex({ userId: 1 });
    await sessionLogsCol.createIndex({ createdAt: -1 });

    console.log('Collections verified in auth_db:');
    const cols = await authDb.listCollections().toArray();
    console.log(cols.map(c => c.name));

    console.log('Database setup complete!');
  } finally {
    await client.close();
  }
}

main().catch(console.error);
