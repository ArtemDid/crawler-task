import { createClient } from "redis";

const urlsRedisClient = createClient();

urlsRedisClient.on("error", (err: any) =>
  console.log("Redis Client Error", err)
);
urlsRedisClient.connect();

const queueRedisClient = createClient();

queueRedisClient.on("error", (err: any) =>
  console.log("Redis Client Error", err)
);
queueRedisClient.connect();

export { urlsRedisClient, queueRedisClient };

export const isExistsUrl = async (parsedUrl: string, done: any) => {
  urlsRedisClient.select(3);

  return urlsRedisClient.exists(
    //@ts-ignore
    parsedUrl,
    (error: any, exists: any) => {
      if (error) return done();

      return parseInt(exists.toString("utf-8")) === 1 ? true : false;
    }
  );
};
