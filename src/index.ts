// const Crawler = require("crawler");
// const { createClient } = require("redis");
// const db = require("../db/db.config");

// let obselete: any = []; // Array of what was crawled already
// let set: any = new Set(); // Array of what was crawled already

// let i = "0";
// let name1 = "temp";
// let check = true;

// let c = new Crawler();
// const client = createClient();
// client.on("error", (err: any) => console.log("Redis Client Error", err));
// client.connect();

// async function crawlAllUrls(url: string) {
//   console.log(`Crawling ${url}`);

//   await c.queue({
//     uri: url,
//     callback: async function (err: any, res: any, done: any) {
//       if (err) throw err;
//       let $ = res.$;
//       try {
//         let urls = $("a");
//         // console.log("**** ", urls);
//         Object.keys(urls).forEach(async (item) => {
//           if (urls[item].type === "tag") {
//             let href = urls[item].attribs.href;
//             if (href) {
//               href = href.trim();

//               set.add(href);
//               console.log("href: ", href);
//               setTimeout(async function () {
//                 crawlAllUrls(href);
//                 // href.startsWith(url)
//                 //   ? crawlAllUrls(href)
//                 //   : crawlAllUrls(`${url}${href}`); // The latter might need extra code to test if its the same site and it is a full domain with no URI
//               }, 5000);
//             }
//           }
//         });
//       } catch (e) {
//         console.error(`Encountered an error crawling ${url}. Aborting crawl.`);
//         done();
//       }
//       done();
//       console.log("done");
//       console.log("length: ", set.size);
//       // if (set.size > 5000) {
//       //   console.log("loading....................");
//       //   // name1 += i;
//       //   // check = false;
//       //   // for (let i = 0; i < set.size; i++) {
//       //   //   await obselete.push({ url: set[i] });
//       //   // }

//       //   for (let value of set) {
//       //     console.log("value: ", value);
//       //     await obselete.push({ url: value });
//       //   }

//       //   console.log(obselete);

//       //   await createUser(obselete);
//       //   done();
//       // }
//     },
//   });
// }

// crawlAllUrls("https://zyro.com/ru/blog/prostoy-sajt-primery/");

// // console.log("Ok");

// export async function createUser(req: any) {
//   await db("customers")
//     .insert(req)
//     .onConflict("url")
//     .ignore()
//     .then(() => {
//       obselete.length = 0;
//       set.clear();
//       console.log("Ok");
//     })
//     .catch((error: any) => {
//       obselete.length = 0;
//       set.clear();
//       console.log("error: ,", error);
//     });

//   // res.sendStatus(200);
// }

import Crawler from "crawler";
import isUrl from "is-url";
const { createClient } = require("redis");

const client = createClient();
client.on("error", (err: any) => console.log("Redis Client Error", err));
client.connect();
let i = 0;

const c = new Crawler({
  maxConnections: 10,
  rateLimit: 100,
});
const urls = new Set<string>();

let execTime = 0;

const getCrawlerCallback = (url: string) => {
  return (err: any, res: any, done: any) => {
    if (err) throw err;
    let $ = res.$;
    try {
      const anchors = $("a");
      // console.log("1");
      Object.keys(anchors).forEach(async (item) => {
        if (anchors[item].type === "tag") {
          const href: string = anchors[item].attribs.href?.trim();
          // console.log("2");
          const parsedUrl: string = isUrl(href)
            ? href
            : `https://www.themanual.com${href}`;

          const start = Date.now();
          // const isExists = urls.has(parsedUrl);
          const isExists = await client.get(parsedUrl);
          // console.log("is: ", isExists);
          // await client.exists(
          //   parsedUrl,
          //   (error: any, exists: any) => {
          //     if (error) return done();

          //     if (parseInt(exists.toString("utf-8")) === 1) return true;
          //     else return false;
          //   }
          // );

          // console.log("is: ", isExists);
          const end = Date.now();

          execTime += end - start;

          try {
            if (
              parsedUrl &&
              href.toString().includes("https://www.themanual.com") &&
              isExists === null
            ) {
              // console.log("5");
              // urls.add(href);
              i++;
              await client.set(href, 0);
              // console.log("***************8");
              href.startsWith(href)
                ? crawlAllUrls(href)
                : crawlAllUrls(`${url}${href}`);
            }
          } catch {
            // console.log("6");
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

crawlAllUrls("https://www.themanual.com");

setInterval(() => {
  console.log("-------- LOGS ---------");
  console.log("urls size", i);
  console.log("queue size", c.queueSize);
  console.log("last execution time on .has", execTime);
}, 5000);
