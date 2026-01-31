import NodeCache from "node-cache";

// StdTTL: 1 hour (3600s), checkperiod: 2 mins (120s)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

export const getCachedData = async (key) => {
  try {
    const value = cache.get(key);
    if (value) {
      console.log(`[Cache] Hit for key: ${key}`);
      return value;
    }
    return null;
  } catch (error) {
    console.error("Error getting cache data:", error);
    return null;
  }
};

export const setCachedData = async (key, value, ttl = 3600) => {
  try {
    // console.log(`[Cache] Set for key: ${key}`);
    cache.set(key, value, ttl);
  } catch (error) {
    console.error("Error setting cache data:", error);
  }
};

// Clear cache helper
export const clearCache = () => {
  cache.flushAll();
};
