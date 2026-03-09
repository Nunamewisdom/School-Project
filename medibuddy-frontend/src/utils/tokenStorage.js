import { openDB } from "idb";

const DB_NAME = "medibuddy-db";
const STORE_NAME = "auth";

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME);
  },
});

export const setTokens = async (tokens) => {
  const db = await dbPromise;
  await db.put(STORE_NAME, tokens, "tokens");
};

export const getTokens = async () => {
  const db = await dbPromise;
  return await db.get(STORE_NAME, "tokens");
};

export const clearTokens = async () => {
  const db = await dbPromise;
  await db.delete(STORE_NAME, "tokens");
};