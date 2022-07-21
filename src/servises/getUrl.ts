import * as cheerio from "cheerio";
import isUrl from "is-url";

export const anchorsOfCheerio = (html) => {
  const $ = cheerio.load(html);
  const anchors = $("a");

  return anchors;
};

export const isParsedUrl = (href: string, domen: string): string =>
  isUrl(href) ? href : `${domen}${href}`;
