import { insertUrl, createTableWithURLs, isExistsUrl } from "../repositories";
import { bull } from "../queues/crawl-queue";
import request from "request";
import { parse } from "tldts";
import { anchorsOfCheerio, isParsedUrl } from "../servises/getUrl";
import { urlsRedisClient, queueRedisClient } from "../../db/redis.config";
import { dataUrl } from "../../data";

let size: number = 0,
  queueSize: number = 0,
  execTime: number = 0;

export const crawlDomain = async (hostname, nameTable) => {
  await createTableWithURLs(nameTable);
  // console.log("category11111: ", nameTable);

  bull.add({ uri: hostname, domen: hostname });
};

bull.process(8, (job, done) => {
  // console.log("data: ", job.data);
  // console.log("id: ", job.id);
  const { domainWithoutSuffix } = parse(job.data.domen);

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
          const isExists =
            (await isExistsUrl(parsedUrl, domainWithoutSuffix as string)) ===
            null
              ? false
              : true;
          const end = Date.now();
          execTime = end - start;
          // console.log("is: ", isExists);
          try {
            if (
              parsedUrl &&
              href.toString().includes(job.data.domen) &&
              !isExists
            ) {
              size++;

              await urlsRedisClient.select(3);
              //@ts-ignore
              await urlsRedisClient.sendCommand([
                "ZADD",
                domainWithoutSuffix as string,
                "0",
                decodeURI(parsedUrl),
              ]);

              // await urlsRedisClient.set(decodeURI(parsedUrl), 0);
              bull.add({
                uri: encodeURI(parsedUrl),
                domen: job.data.domen,
              });

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

  let arrWithUrl = [];
  let itemRedisValue: string | null = "";

  for (const url_item of dataUrl) {
    const dataDomain = parse(url_item);

    urlsRedisClient.select(3);
    const keys: [] = await urlsRedisClient.sendCommand([
      "ZRANGE",
      dataDomain.domainWithoutSuffix as string,
      "0",
      "500",
      "WITHSCORES",
    ]);

    // console.log("keys: ", keys);

    for (let i = 1; i < keys.length; i += 2) {
      const keyUrl = parse(keys[i - 1]);
      urlsRedisClient.select(3);

      if (
        keys[i] === "0" &&
        dataDomain.domainWithoutSuffix === keyUrl.domainWithoutSuffix
      ) {
        //@ts-ignore
        arrWithUrl.push({ url: keys[i - 1] });
        urlsRedisClient.select(3);
        await urlsRedisClient.sendCommand([
          "ZINCRBY",
          dataDomain.domainWithoutSuffix as string,
          "1",
          keys[i - 1],
        ]);
      }
    }

    if (arrWithUrl.length)
      await insertUrl(arrWithUrl, dataDomain.domainWithoutSuffix as string);

    console.log(arrWithUrl);

    arrWithUrl.length = 0;
  }
  // check = true;
}, 5000);
