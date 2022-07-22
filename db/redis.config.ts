import { createClient, RedisClientOptions } from "redis";

export const redisOptions = {
  host: process.env.HOST,
  port: parseInt(process.env.PORTREDIS || "6379"),
  maxRetriesPerRequest: null,
  connectTimeout: 180000,
};

const urlsRedisClient = createClient(redisOptions as RedisClientOptions);

urlsRedisClient.on("error", (err: any) =>
  console.log("Redis Client Error", err)
);
urlsRedisClient.connect();

const queueRedisClient = createClient(redisOptions as RedisClientOptions);

queueRedisClient.on("error", (err: any) =>
  console.log("Redis Client Error", err)
);
queueRedisClient.connect();

export { urlsRedisClient, queueRedisClient };
