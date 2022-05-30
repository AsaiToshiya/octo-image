#!/usr/bin/env node
import puppeteer from "puppeteer-core";

const INVOLVES_USAGE = "octo-image involves [--absolute-time] <user>";

const involves = async (user, absoluteTime) => {
  const browser = await puppeteer.launch({ channel: "chrome" });
  const page = await browser.newPage();
  await page.goto(`https://github.com/search?q=involves:${user}`);
  await page.waitForSelector("#issue_search_results");
  const targetElement = await page.$("#issue_search_results");

  if (absoluteTime) {
    const relativeTimes = await targetElement.$$("relative-time");
    for (const relativeTime of relativeTimes) {
      const dateTime = await relativeTime.evaluate((el) =>
        el.getAttribute("datetime")
      );
      const date = new Date(dateTime);
      const day = date.getDate();
      const month = date.toLocaleString("en-us", { month: "short" });
      const year = date.getFullYear();
      await relativeTime.evaluate(
        (el, day, month, year) => (el.innerText = `on ${day} ${month} ${year}`),
        day,
        month,
        year
      );
    }
  }

  const childToHide = await targetElement.$(".paginate-container");
  if (childToHide) {
    await childToHide.evaluate((el) => (el.style.display = "none"));
  }
  await targetElement.screenshot({ path: "involves.png" });
  await browser.close();
};

const args = process.argv.slice(2);
const command = args.shift();

if (command == "involves") {
  const value = args.pop();
  if (value) {
    (async () => {
      await involves(value, args.includes("--absolute-time"));
    })();
  } else {
    console.log(INVOLVES_USAGE);
  }
} else {
  console.log(INVOLVES_USAGE);
}
