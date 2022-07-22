import { insertUrl, createTableWithURLs } from "../repositories/requestToDB";
import { bull } from "../queues/crawl-queue";
import request from "request";
import { parse } from "tldts";
import { anchorsOfCheerio, isParsedUrl } from "../servises/getUrl";
import {
  isExistsUrl,
  urlsRedisClient,
  queueRedisClient,
} from "../../db/redis.config";
import { dataUrl } from "../../data";

let size: number = 0,
  queueSize: number = 0,
  execTime: number = 0;

export const crawlDomain = async (hostname, nameTable) => {
  await createTableWithURLs(nameTable);

  bull.add({ uri: hostname, domen: hostname });
};

bull.process(50, (job, done) => {
  console.log("data: ", job.data);
  console.log("id: ", job.id);

  request(job.data.uri, (error, response, html) => {
    if (error || response.statusCode !== 200) done();

    try {
      const anchors = anchorsOfCheerio(html);

      Object.keys(anchors).forEach(async (item) => {
        if (anchors[item].type === "tag") {
          const href: string = anchors[item].attribs.href
            ?.trim()
            .replace(/(.+)(\/)$/, "$1");

          const parsedUrl: string = isParsedUrl(href, job.data.domen);

          const start = Date.now();
          const isExists = await isExistsUrl(parsedUrl, done);
          const end = Date.now();
          execTime = end - start;
          // console.log("is: ", isExists);
          try {
            if (
              parsedUrl &&
              href.toString().includes(job.data.domen) &&
              !isExists
            ) {
              // await client.select(3);
              await urlsRedisClient.set(decodeURI(parsedUrl), 0);

              bull.add({
                uri: encodeURI(parsedUrl),
                domen: job.data.domen,
              });

              size++;
              queueSize = parseInt(job.id.toString());
            }
          } catch {
            done();
          }
        }
      });
    } catch (e) {
      console.log("bbbbbbbbb");
      done();
    }
    done();
  });
});

setInterval(async () => {
  // if (check) {
  // check = false;
  console.log("-------- LOGS ---------");
  console.log("urls size", size);
  console.log("queue size", queueSize);
  console.log("last execution time on .has", execTime);
  // console.log("domen ", domen);

  urlsRedisClient.select(3);
  const keys: [] = await urlsRedisClient.sendCommand(["keys", "*"]);
  let arrWithUrl = [];
  let itemRedisValue: string | null = "";

  for (const url_item of dataUrl) {
    const dataDomain = parse(url_item);

    for (const key of keys) {
      const keyUrl = parse(key);
      urlsRedisClient.select(3);
      itemRedisValue = await urlsRedisClient.get(key);

      if (
        itemRedisValue === "0" &&
        dataDomain.domainWithoutSuffix === keyUrl.domainWithoutSuffix
      ) {
        //@ts-ignore
        arrWithUrl.push({ url: key });
        urlsRedisClient.select(3);
        await urlsRedisClient.getSet(key, "1");
      }
    }

    if (arrWithUrl.length)
      await insertUrl(arrWithUrl, dataDomain.domainWithoutSuffix as string);

    arrWithUrl.length = 0;
  }
  // check = true;
}, 5000);
