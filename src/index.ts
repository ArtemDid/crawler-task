import Crawler from "crawler";
import isUrl from "is-url";
import db from "../db/knex.config";
import client from "../db/redis.config";

let i = 0;

const c = new Crawler({
  maxConnections: 10,
  rateLimit: 100,
});

let execTime = 0;

let domen: any = "";

const getCrawlerCallback = (url: string) => {
  return (err: any, res: any, done: any) => {
    if (err) throw err;
    let $ = res.$;
    try {
      const anchors = $("a");
      // console.log("1");
      Object.keys(anchors).forEach(async (item) => {
        if (anchors[item].type === "tag") {
          const href: string = anchors[item].attribs.href
            ?.trim()
            .replace(/(.+)(\/)$/, "$1");
          // console.log("2");
          const parsedUrl: string = isUrl(href) ? href : `${domen}${href}`;

          const start = Date.now();
          // const isExists = urls.has(parsedUrl);
          // const isExists = await client.get(parsedUrl);
          // console.log("is: ", isExists);
          const isExists = await client.exists(
            //@ts-ignore
            parsedUrl,
            (error: any, exists: any) => {
              if (error) return done();

              if (parseInt(exists.toString("utf-8")) === 1) return true;
              else return false;
            }
          );

          // console.log("is: ", isExists);
          const end = Date.now();

          execTime = end - start;

          try {
            if (parsedUrl && href.toString().includes(domen) && !isExists) {
              // console.log("5");
              // urls.add(href);
              i++;
              // await client.set(href, 0);
              // // console.log("***************8");
              // href.startsWith(href)
              //   ? crawlAllUrls(href)
              //   : crawlAllUrls(`${url}${href}`);

              // console.log("domen: ", domen);

              await client.set(decodeURI(parsedUrl), 0);

              crawlAllUrls(encodeURI(parsedUrl));
            }
          } catch (e) {
            // console.log("mmmmmmmmmmmm");
            done();
          }
        }
      });
    } catch (e) {
      // console.error(`Encountered an error crawling ${url}. Aborting crawl.`);
      console.log("bbbbbbbbb");
      done();
    }
    done();
  };
};

function crawlAllUrls(url: string) {
  c.queue({
    uri: url,
    callback: getCrawlerCallback(url),
  });
}

let temp = "https://www.themanual.com/food-and-drink/best-large-air-fryers/";

let temp2 = temp.split(/\/\/|\//);

domen = temp2[0] === "https:" ? temp2[0] + "//" + temp2[1] : null;

// console.log(domen.replace(/(.+)(\/)$/, "$1"));

crawlAllUrls("https://www.themanual.com");

setInterval(async () => {
  console.log("-------- LOGS ---------");
  console.log("urls size", i);
  console.log("queue size", c.queueSize);
  console.log("last execution time on .has", execTime);
  // try {
  const keys: [] = await client.sendCommand(["keys", "*"]);
  // console.log(keys); // ["aXF","x9U","lOk",...]
  let arrWithUrl = [];
  let itemRedisValue: string | null = "";
  for (const key of keys) {
    // console.log("1", key);
    itemRedisValue = await client.get(key);
    // console.log("item: ", item);
    if (itemRedisValue === "0") {
      // console.log("2");
      //@ts-ignore
      arrWithUrl.push({ url: key });
      // console.log("3");
      //@ts-ignore
      await client.getSet(key, "1");
    }
  }

  await createUser(arrWithUrl);

  // console.log("temp: ", arrWithUrl, arrWithUrl.length);
  // } catch {
  //   console.log("Error");
  // }
}, 5000);

async function createUser(req: any) {
  await db("customers")
    .insert(req)
    .onConflict("url")
    .ignore()
    .then(() => {
      console.log("Ok");
    })
    .catch((error: any) => {
      console.log("error: ,", error);
    });
}
