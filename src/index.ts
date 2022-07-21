import Crawler from "crawler";
import Queue from "bull";
import request from "request";
import db, { insertUrl, createTableWithURLs } from "../db/knex.config";
import client, { isExistsUrl } from "../db/redis.config";
import { parse } from "tldts";
import { anchorsOfCheerio, isParsedUrl } from "./servises/getUrl";

const URLsQueue = new Queue("parser", "redis://127.0.0.1:6379");

let size = 0;
let queueSize: number,
  execTime: number = 0;

let dataUrl: Array<string> = [
  "https://www.themanual.com/food-and-drink/best-large-air-fryers/",
  "https://www.digitaltrends.com/home/best-air-fryers/",
  "https://www.21oak.com/shop/air-fryer-deals-prime-day/",
  "https://www.cnn.com/cnn-underscored/reviews/best-air-fryer",
  "https://www.dontwasteyourmoney.com/best-air-fryer/",
  "https://www.forbes.com/sites/forbes-personal-shopper/2021/06/21/best-air-fryers-on-amazon/?sh=27540843d3a4",
  "https://www.nbcnews.com/select/shopping/best-air-fryers-ncna1288553",
  "https://nypost.com/article/best-air-fryers-on-amazon/",
  "https://www.bustle.com/wellness/the-7-best-air-fryers-on-amazon-22794431",
  "https://www.bobvila.com/articles/best-air-fryers/",
  "https://www.wired.com/gallery/best-air-purifiers/",
  "https://www.glamour.com/gallery/best-makeup-gift-sets",
  "https://bestreviews.com/kitchen/air-fryers/best-air-fryers",
  "https://www.purewow.com/home/best-air-fryers",
  "https://www.reviewed.com/small-appliances/best-right-now/best-air-fryer-toaster-ovens",
  "https://www.cnet.com/tech/computing/best-laptop/",
  "https://www.dailymail.co.uk/best-buys/best-air-fryers-uk",
  "https://nymag.com/strategist/strategist/fashion/",
  "https://www.buzzfeed.com/hannahloewentheil/the-best-air-fryer-for-every-type-of-home-cook",
  "https://www.lifesavvy.com/50046/the-best-air-fryers-for-health-cooking/",
  "https://www.goodhousekeeping.com/appliances/a24630295/best-air-fryers-reviews/",
  "https://www.popularmechanics.com/home/food-drink/a35180245/best-air-fryers/",
  "https://www.usnews.com/360-reviews/home-goods/air-purifier",
  "https://www.insider.com/guides/kitchen/best-air-fryer",
  "https://www.gearhungry.com/best-dog-bark-collars/",
];

URLsQueue.process((job, done) => {
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
          console.log("is: ", isExists);
          try {
            if (
              parsedUrl &&
              href.toString().includes(job.data.domen) &&
              !isExists
            ) {
              await client.select(3);
              await client.set(decodeURI(parsedUrl), 0);

              URLsQueue.add({
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

// for (const url_item of dataUrl) {
const { hostname, domainWithoutSuffix } = parse(dataUrl[0]);

start("https://" + hostname, domainWithoutSuffix);
// }

async function start(hostname, nameTable) {
  await createTableWithURLs(nameTable);

  URLsQueue.add({ uri: hostname, domen: hostname });
}

// let check = true;

setInterval(async () => {
  // if (check) {
  // check = false;
  console.log("-------- LOGS ---------");
  console.log("urls size", size);
  console.log("queue size", queueSize);
  console.log("last execution time on .has", execTime);
  // console.log("domen ", domen);

  const keys: [] = await client.sendCommand(["keys", "*"]);
  let arrWithUrl = [];
  let itemRedisValue: string | null = "";

  for (const url_item of dataUrl) {
    const dataDomain = parse(url_item);

    for (const key of keys) {
      const keyUrl = parse(key);
      client.select(3);
      itemRedisValue = await client.get(key);

      if (
        itemRedisValue === "0" &&
        dataDomain.domainWithoutSuffix === keyUrl.domainWithoutSuffix
      ) {
        //@ts-ignore
        arrWithUrl.push({ url: key });
        client.select(3);
        await client.getSet(key, "1");
      }
    }

    if (arrWithUrl.length)
      await insertUrl(arrWithUrl, dataDomain.domainWithoutSuffix as string);

    arrWithUrl.length = 0;
  }
  // check = true;
}, 5000);
