#!/usr/bin/env node
import fs from "fs";
import https from "https";

import { JSDOM } from "jsdom";
import { chromium } from "playwright-core";

const AVATAR_USAGE = "octo-image avatar <user>";
const CONTRIBUTION_GRAPH_USAGE = "octo-image contribution-graph <user>";
const HELP_USAGE = "octo-image help";
const INVOLVES_USAGE =
  "octo-image involves [--absolute-time] [--exclude-user <user>] [--sort <criteria>] <user>";
const OPEN_GRAPH_USAGE = "octo-image open-graph <user> <repo>";

/**
 * <pre><code class="javascript">import { avatar } from "octo-image";
 * </code></pre>
 * @param {string} user - ユーザー
 */
export const avatar = async (user) => {
  _downloadOpenGraph(`https://github.com/${user}`, "avatar.png");
};

/**
 * <pre><code class="javascript">import { contributionGraph } from "octo-image";
 * </code></pre>
 * @param {string} user - ユーザー
 */
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

/**
 * <pre><code class="javascript">import { involves } from "octo-image";
 * </code></pre>
 * @param {string} user - ユーザー
 * @param {boolean} [absoluteTime] - true の場合は絶対時刻。それ以外の場合は相対時刻
 * @param {string} [excludeUser] - 除外するユーザー
 * @param {string} [sort] - ソート修飾子。https://docs.github.com/ja/search-github/getting-started-with-searching-on-github/sorting-search-results を参照
 */
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

/**
 * <pre><code class="javascript">import { openGraph } from "octo-image";
 * </code></pre>
 * @param {string} user - ユーザー
 * @param {string} repo - リポジトリ
 */
export const openGraph = async (user, repo) => {
  _downloadOpenGraph(`https://github.com/${user}/${repo}`, "open-graph.png");
};

const _downloadOpenGraph = async (pageUrl, filename) => {
  const dom = await JSDOM.fromURL(pageUrl);
  const node = dom.window.document.querySelector('meta[property="og:image"]');
  const url = node.getAttribute("content");
  https.get(url, (res) => {
    res.pipe(fs.createWriteStream(filename));
  });
};

const _help = () => {
  console.log(AVATAR_USAGE);
  console.log(CONTRIBUTION_GRAPH_USAGE);
  console.log(HELP_USAGE);
  console.log(INVOLVES_USAGE);
  console.log(OPEN_GRAPH_USAGE);
};

const _parseInvolvesArgs = (args) => {
  const user = args.pop();
  const absoluteTime = args.includes("--absolute-time");
  const excludeUserIndex = args.indexOf("--exclude-user");
  const hasExcludeUser = excludeUserIndex > -1;
  const excludeUser = hasExcludeUser ? args[excludeUserIndex + 1] : null;
  const sortIndex = args.indexOf("--sort");
  const hasSort = sortIndex > -1;
  const sort = hasSort ? args[sortIndex + 1] : null;
  return { user, hasExcludeUser, excludeUser, hasSort, sort, absoluteTime };
};

const args = process.argv.slice(2);
const subcommandName = args.shift();

const subcommand = {
  avatar: (args) => {
    const [user] = args;
    if (user) {
      (async () => {
        await avatar(user);
      })();
    } else {
      console.log(AVATAR_USAGE);
    }
  },
  "contribution-graph": (args) => {
    const [user] = args;
    if (user) {
      (async () => {
        await contributionGraph(user);
      })();
    } else {
      console.log(CONTRIBUTION_GRAPH_USAGE);
    }
  },
  help: _help,
  involves: (args) => {
    const { user, hasExcludeUser, excludeUser, hasSort, sort, absoluteTime } =
      _parseInvolvesArgs(args);
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
  },
  "open-graph": (args) => {
    const [user, repo] = args;
    if (user && repo) {
      (async () => {
        await openGraph(user, repo);
      })();
    } else {
      console.log(OPEN_GRAPH_USAGE);
    }
  },
}[subcommandName];
subcommand ? subcommand(args) : _help();
