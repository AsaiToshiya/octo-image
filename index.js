#!/usr/bin/env node
import fs from "fs";
import https from "https";

import { JSDOM } from "jsdom";
import { chromium } from "playwright-core";

const CONTRIBUTION_GRAPH_USAGE = "octo-image contribution-graph <user>";
const INVOLVES_USAGE =
  "octo-image involves [--absolute-time] [--exclude-user <user>] [--sort <criteria>] <user>";
const OPEN_GRAPH_USAGE = "octo-image open-graph <user> <repo>";

export const contributionGraph = async (user) => {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const context = await browser.newContext({ deviceScaleFactor: 2 }); // 高 DPI
    const page = await context.newPage();
    page.setDefaultTimeout(0);
    await page.goto(`https://github.com/${user}`);
    await page.waitForSelector(".js-calendar-graph-svg");
    const element = await page.$(".js-calendar-graph-svg");
    await element.screenshot({ path: "contribution-graph.png" });
  } finally {
    await browser.close();
  }
};

export const involves = async (user, absoluteTime, excludeUser, sort) => {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const context = await browser.newContext({ deviceScaleFactor: 2 }); // 高 DPI
    const page = await context.newPage();
    page.setDefaultTimeout(0);
    await page.goto(
      `https://github.com/search?q=involves:${user}` +
        (excludeUser ? `+-user:${excludeUser}` : "") +
        (sort ? `+sort:${sort}` : "")
    );
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
          (el, date) =>
            (el.innerText = `on ${date.day} ${date.month} ${date.year}`),
          { day, month, year }
        );
      }
    }

    const elementToHide = await targetElement.$(".paginate-container");
    if (elementToHide) {
      await elementToHide.evaluate((el) => (el.style.display = "none"));
    }
    await targetElement.screenshot({ path: "involves.png" });
  } finally {
    await browser.close();
  }
};

export const openGraph = async (user, repo) => {
  const dom = await JSDOM.fromURL(`https://github.com/${user}/${repo}`);
  const node = dom.window.document.querySelector('meta[property="og:image"]');
  const url = node.getAttribute("content");
  https.get(url, (res) => {
    res.pipe(fs.createWriteStream("open-graph.png"));
  });
};

const args = process.argv.slice(2);
const command = args.shift();

if (command == "contribution-graph") {
  const [user] = args;
  if (user) {
    (async () => {
      await contributionGraph(user);
    })();
  } else {
    console.log(CONTRIBUTION_GRAPH_USAGE);
  }
} else if (command == "involves") {
  const user = args.pop();
  const absoluteTime = args.includes("--absolute-time");
  const excludeUserIndex = args.indexOf("--exclude-user");
  const hasExcludeUser = excludeUserIndex > -1;
  const excludeUser = hasExcludeUser ? args[excludeUserIndex + 1] : null;
  const sortIndex = args.indexOf("--sort");
  const hasSort = sortIndex > -1;
  const sort = hasSort ? args[sortIndex + 1] : null;
  if (
    user &&
    (!hasExcludeUser ||
      (excludeUser &&
        excludeUser != "--absolute-time" &&
        excludeUser != "--sort")) &&
    (!hasSort ||
      (sort && sort != "--absolute-time" && sort != "--exclude-user"))
  ) {
    (async () => {
      await involves(user, absoluteTime, excludeUser, sort);
    })();
  } else {
    console.log(INVOLVES_USAGE);
  }
} else if (command == "open-graph") {
  const [user, repo] = args;
  if (user && repo) {
    (async () => {
      await openGraph(user, repo);
    })();
  } else {
    console.log(OPEN_GRAPH_USAGE);
  }
} else {
  console.log(CONTRIBUTION_GRAPH_USAGE);
  console.log(INVOLVES_USAGE);
  console.log(OPEN_GRAPH_USAGE);
}
