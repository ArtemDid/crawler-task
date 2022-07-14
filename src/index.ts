const Crawler = require("crawler");
const { createClient } = require("redis");
const db = require("../db/db.config");

let obselete: any = []; // Array of what was crawled already
let set: any = new Set(); // Array of what was crawled already

let i = "0";
let name1 = "temp";
let check = true;

let c = new Crawler();
const client = createClient();
client.on("error", (err: any) => console.log("Redis Client Error", err));
client.connect();

async function crawlAllUrls(url: string) {
  console.log(`Crawling ${url}`);

  await c.queue({
    uri: url,
    callback: async function (err: any, res: any, done: any) {
      if (err) throw err;
      let $ = res.$;
      try {
        let urls = $("a");
        // console.log("**** ", urls);
        Object.keys(urls).forEach(async (item) => {
          if (urls[item].type === "tag") {
            let href = urls[item].attribs.href;
            if (href) {
              href = href.trim();

              set.add(href);
              console.log("href: ", href);
              setTimeout(async function () {
                href.startsWith(url)
                  ? crawlAllUrls(href)
                  : crawlAllUrls(`${url}${href}`); // The latter might need extra code to test if its the same site and it is a full domain with no URI
              }, 5000);
            }
          }
        });
      } catch (e) {
        console.error(`Encountered an error crawling ${url}. Aborting crawl.`);
        done();
      }
      done();
      console.log("done");
      console.log("length: ", set.size);
      if (set.size > 5000) {
        console.log("loading....................");
        // name1 += i;
        // check = false;
        // for (let i = 0; i < set.size; i++) {
        //   await obselete.push({ url: set[i] });
        // }

        for (let value of set) {
          console.log("value: ", value);
          await obselete.push({ url: value });
        }

        console.log(obselete);

        await createUser(obselete);
        done();
      }
    },
  });
}

crawlAllUrls("https://www.themanual.com");

// console.log("Ok");

export async function createUser(req: any) {
  await db("customers")
    .insert(req)
    .onConflict("url")
    .ignore()
    .then(() => {
      obselete.length = 0;
      set.clear();
      console.log("Ok");
    })
    .catch((error: any) => {
      obselete.length = 0;
      set.clear();
      console.log("error: ,", error);
    });

  // res.sendStatus(200);
}
