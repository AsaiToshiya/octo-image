#!/usr/bin/env node
import puppeteer from "puppeteer-core";

const involves = async (user) => {
  const browser = await puppeteer.launch({ channel: "chrome" });
  const page = await browser.newPage();
  await page.goto(`https://github.com/search?q=involves:${user}`);
  await page.waitForSelector("#issue_search_results");
  const targetElement = await page.$("#issue_search_results");
  const childToHide = await targetElement.$(".paginate-container");
  if (childToHide) {
    await childToHide.evaluate((el) => (el.style.display = "none"));
  }
  await targetElement.screenshot({ path: "involves.png" });
  await browser.close();
};

const [command, value] = process.argv.slice(2);

if (command != "involves" || !value) {
  console.log("octo-image involves <user>");
  process.exit();
}

(async () => {
  await involves(value);
})();
