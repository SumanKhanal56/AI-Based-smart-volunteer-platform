// This script copies local MongoDB data to MongoDB Atlas.
import 'dotenv/config';
import mongoose from 'mongoose';

const localUri = 'mongodb://volunterr_admin:volunterr_dev@127.0.0.1:27017/volunterr?authSource=admin';
const atlasUri = process.env.MONGODB_URI || '';

function assertSafeTarget() {
  if (!atlasUri.startsWith('mongodb+srv://')) throw new Error('MONGODB_URI must contain an Atlas mongodb+srv connection string.');
  if (/127\.0\.0\.1|localhost/i.test(atlasUri)) throw new Error('The Atlas target cannot be a local MongoDB address.');
}

async function copyIndexes(sourceCollection, targetCollection) {
  const indexes = await sourceCollection.indexes();
  const targetIndexes = await targetCollection.indexes();
  for (const index of indexes.filter((item) => item.name !== '_id_')) {
    const { key, name, v, ns, ...options } = index;
    void v;
    void ns;
    const targetHasSameName = targetIndexes.some((item) => item.name === name);
    const targetHasTextIndex = index.weights && targetIndexes.some((item) => item.weights);
    if (targetHasSameName || targetHasTextIndex) continue;
    await targetCollection.createIndex(key, { ...options, name });
  }
  return indexes.length;
}

async function migrateCollection(sourceDatabase, targetDatabase, name) {
  const sourceCollection = sourceDatabase.collection(name);
  const targetCollection = targetDatabase.collection(name);
  const documents = await sourceCollection.find({}).toArray();

  if (documents.length) {
    await targetCollection.bulkWrite(
      documents.map((document) => ({
        replaceOne: {
          filter: { _id: document._id },
          replacement: document,
          upsert: true
        }
      })),
      { ordered: false }
    );
  }

  const indexCount = await copyIndexes(sourceCollection, targetCollection);
  const targetCount = await targetCollection.countDocuments({ _id: { $in: documents.map((document) => document._id) } });
  if (targetCount !== documents.length) throw new Error(`Count verification failed for ${name}.`);
  return { name, documents: documents.length, indexes: indexCount };
}

async function run() {
  assertSafeTarget();
  const source = mongoose.createConnection(localUri, { serverSelectionTimeoutMS: 10_000 });
  const target = mongoose.createConnection(atlasUri, { serverSelectionTimeoutMS: 15_000 });

  try {
    await Promise.all([source.asPromise(), target.asPromise()]);
    const collections = await source.db.listCollections({}, { nameOnly: true }).toArray();
    const names = collections.map((item) => item.name).filter((name) => !name.startsWith('system.'));
    const results = [];
    for (const name of names) results.push(await migrateCollection(source.db, target.db, name));

    console.log(`Migration complete: ${results.length} collections.`);
    for (const result of results) console.log(`${result.name}: ${result.documents} documents, ${result.indexes} indexes verified.`);
  } finally {
    await Promise.allSettled([source.close(), target.close()]);
  }
}

run().catch((error) => {
  console.error(`Migration failed: ${error.name || 'Error'}${error.code ? ` (${error.code})` : ''}`);
  process.exitCode = 1;
});
