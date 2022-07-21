import Crawler from "crawler";
import isUrl from "is-url";
import db, { insertUrl } from "../db/knex.config";
import client from "../db/redis.config";
import { parse } from "tldts";

const c = new Crawler({
  maxConnections: 10,
  rateLimit: 100,
});

let execTime = 0;
let i: number = 0;
// let domen: any = "";

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

let k = 1;

const getCrawlerCallback = (url: string, domen: string) => {
  return (err: any, res: any, done: any) => {
    if (err) throw err;

    let $ = res.$;
    try {
      const anchors = $("a");
      Object.keys(anchors).forEach(async (item) => {
        if (anchors[item].type === "tag") {
          const href: string = anchors[item].attribs.href
            ?.trim()
            .replace(/(.+)(\/)$/, "$1");

          const parsedUrl: string = isUrl(href) ? href : `${domen}${href}`;

          // console.log("parsed: ", parsedUrl);

          const start = Date.now();
          const isExists = await client.exists(
            //@ts-ignore
            parsedUrl,
            (error: any, exists: any) => {
              if (error) return done();

              if (parseInt(exists.toString("utf-8")) === 1) return true;
              else return false;
            }
          );

          const end = Date.now();

          execTime = end - start;
          // console.log("1:");

          try {
            if (parsedUrl && href.toString().includes(domen) && !isExists) {
              await client.set(decodeURI(parsedUrl), 0);

              crawlAllUrls(encodeURI(parsedUrl), domen);

              i += k;
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
  };
};

function crawlAllUrls(url: string, domen: string) {
  c.queue({
    uri: url,
    callback: getCrawlerCallback(url, domen),
  });
}

let arrOfUrl: any;
let nameTable: string;

for (const url_item of dataUrl) {
  const { hostname, domainWithoutSuffix } = parse(url_item);

  start("https://" + hostname, domainWithoutSuffix);
}

async function start(domen, nameTable) {
  if (!(await db.schema.hasTable(nameTable))) {
    await db.schema.createTable(nameTable, (table) => {
      table.increments("id").primary().unsigned();
      table.text("url").unique();
    });
  }

  crawlAllUrls(domen, domen);
}

let check = true;

setInterval(async () => {
  if (check) {
    check = false;
    console.log("-------- LOGS ---------");
    console.log("urls size", i);
    console.log("queue size", c.queueSize);
    console.log("last execution time on .has", execTime);
    // console.log("domen ", domen);

    const keys: [] = await client.sendCommand(["keys", "*"]);
    let arrWithUrl = [];
    let itemRedisValue: string | null = "";

    for (const url_item of dataUrl) {
      const dataDomain = parse(url_item);

      for (const key of keys) {
        const keyUrl = parse(key);

        itemRedisValue = await client.get(key);

        if (
          itemRedisValue === "0" &&
          dataDomain.domainWithoutSuffix === keyUrl.domainWithoutSuffix
        ) {
          //@ts-ignore
          arrWithUrl.push({ url: key });
          await client.getSet(key, "1");
        }
      }

      if (arrWithUrl.length)
        await insertUrl(arrWithUrl, dataDomain.domainWithoutSuffix as string);

      arrWithUrl.length = 0;
    }
    check = true;
  }
}, 5000);
