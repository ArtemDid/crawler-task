import { parse } from "tldts";
import { crawlDomain } from "./jobs/craw-job";
import { dataUrl } from "../data";

// for (const url_item of dataUrl) {
const { hostname, domainWithoutSuffix } = parse(dataUrl[0]);

crawlDomain("https://" + hostname, domainWithoutSuffix);
// }
