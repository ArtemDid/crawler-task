import { parse } from "tldts";
import { crawlDomain } from "./jobs/craw-job";
import { dataUrl } from "../data";

for (const url_item of dataUrl) {
  const { hostname, domainWithoutSuffix } = parse(url_item);

  crawlDomain("https://" + hostname, domainWithoutSuffix);
}
