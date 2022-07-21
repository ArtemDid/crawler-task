import { createClient } from "redis";

const client = createClient();

client.on("error", (err: any) => console.log("Redis Client Error", err));
client.connect();

export default client;

export const isExistsUrl = async (parsedUrl: string, done: any) => {
  client.select(3);

  return client.exists(
    //@ts-ignore
    parsedUrl,
    (error: any, exists: any) => {
      if (error) return done();

      return parseInt(exists.toString("utf-8")) === 1 ? true : false;
    }
  );
};
