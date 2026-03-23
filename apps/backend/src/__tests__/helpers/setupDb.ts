import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;

/**
 * Starts an in-memory MongoDB instance and connects Mongoose.
 * Call in beforeAll() of integration tests.
 */
export const connectTestDb = async (): Promise<void> => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
};

/**
 * Drops all collections between tests to ensure isolation.
 * Call in afterEach() of integration tests.
 */
export const clearTestDb = async (): Promise<void> => {
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
};

/**
 * Disconnects Mongoose and stops the in-memory server.
 * Call in afterAll() of integration tests.
 */
export const disconnectTestDb = async (): Promise<void> => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
};