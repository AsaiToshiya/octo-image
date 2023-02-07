#!/usr/bin/env node
import fs from "fs";
import https from "https";

import { JSDOM } from "jsdom";
import { chromium } from "playwright-core";

const AVATAR_USAGE = "octo-image avatar <user>";
const CONTRIBUTION_GRAPH_USAGE =
  "octo-image contribution-graph [--year <year>] <user>";
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
  await _downloadOpenGraph(`https://github.com/${user}`, "avatar.png");
};

/**
 * <pre><code class="javascript">import { contributionGraph } from "octo-image";
 * </code></pre>
 * @param {string} user - ユーザー
 * @param {number} [year] - 年
 */
export const contributionGraph = async (user, year) => {
  await _screenshot(
    `https://github.com/${user}` +
      (year ? `?tab=overview&from=${year}-01-01&to=${year}-12-31` : ""),
    ".js-calendar-graph-svg",
    "contribution-graph.png"
  );
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
  await _screenshot(
    `https://github.com/search?q=involves:${user}` +
      (excludeUser ? `+-user:${excludeUser}` : "") +
      (sort ? `+sort:${sort}` : ""),
    "#issue_search_results",
    "involves.png",
    async (targetElement) => {
      absoluteTime && (await _convertToAbsoluteTime(targetElement));
      await _hidePagination(targetElement);
    }
  );
};

/**
 * <pre><code class="javascript">import { openGraph } from "octo-image";
 * </code></pre>
 * @param {string} user - ユーザー
 * @param {string} repo - リポジトリ
 */
export const openGraph = async (user, repo) => {
  await _downloadOpenGraph(`https://github.com/${user}/${repo}`, "open-graph.png");
};

const _convertToAbsoluteTime = async (targetElement) => {
  const relativeTimes = await targetElement.$$("relative-time");
  await Promise.all(
    relativeTimes.map(async (relativeTime) => {
      const dateTime = await relativeTime.evaluate((el) =>
        el.getAttribute("datetime")
      );
      const date = new Date(dateTime);
      const day = date.getDate();
      const month = date.toLocaleString("en-us", { month: "short" });
      const year = date.getFullYear();
      await relativeTime.evaluate(
        (el, date) =>
          el.replaceWith(
            Object.assign(document.createElement("span"), {
              innerText: `on ${date.day} ${date.month} ${date.year}`,
              class: "no-wrap",
            })
          ),
        { day, month, year }
      );
    })
  );
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

const _hidePagination = async (targetElement) => {
  const elementToHide = await targetElement.$(".paginate-container");
  elementToHide &&
    (await elementToHide.evaluate((el) =>
      el.style.setProperty("display", "none")
    ));
};

const _parseContributionGraphArgs = (args) => {
  const newArgs = args.slice(0, args.length - 1);
  const user = args[args.length - 1];
  const yearIndex = newArgs.indexOf("--year");
  const hasYear = yearIndex > -1;
  const year = hasYear ? newArgs[yearIndex + 1] : null;
  return { user, hasYear, year };
};

const _parseInvolvesArgs = (args) => {
  const user = args[args.length - 1];
  const newArgs = args.slice(0, args.length - 1);
  const absoluteTime = newArgs.includes("--absolute-time");
  const excludeUserIndex = newArgs.indexOf("--exclude-user");
  const hasExcludeUser = excludeUserIndex > -1;
  const excludeUser = hasExcludeUser ? newArgs[excludeUserIndex + 1] : null;
  const sortIndex = newArgs.indexOf("--sort");
  const hasSort = sortIndex > -1;
  const sort = hasSort ? newArgs[sortIndex + 1] : null;
  return { user, hasExcludeUser, excludeUser, hasSort, sort, absoluteTime };
};

const _screenshot = async (url, selector, filename, additionalScripts) => {
  const browser = await chromium.launch({ channel: "chrome" });
  await _try(async () => {
    const context = await browser.newContext({ deviceScaleFactor: 2 }); // 高 DPI
    const page = await context.newPage();
    page.setDefaultTimeout(0);
    await page.goto(url);
    await page.waitForSelector(selector);
    const targetElement = await page.$(selector);
    additionalScripts && (await additionalScripts(targetElement));
    await targetElement.screenshot({ path: filename });
  });
  await browser.close();
};

const _try = async (func) => {
  try {
    await func();
  } catch (e) {}
};

const [subcommandName, ...args] = process.argv.slice(2);
const subcommand =
  {
    avatar: ([user]) => {
      user ? avatar(user) : console.log(AVATAR_USAGE);
    },
    "contribution-graph": (args) => {
      const { user, hasYear, year } = _parseContributionGraphArgs(args);
      user && (!hasYear || year)
        ? contributionGraph(user)
        : console.log(CONTRIBUTION_GRAPH_USAGE);
    },
    involves: (args) => {
      const { user, hasExcludeUser, excludeUser, hasSort, sort, absoluteTime } =
        _parseInvolvesArgs(args);
      const isValidExcludeUser =
        !hasExcludeUser ||
        (excludeUser &&
          excludeUser != "--absolute-time" &&
          excludeUser != "--sort");
      const isValidSort =
        !hasSort ||
        (sort && sort != "--absolute-time" && sort != "--exclude-user");
      user && isValidExcludeUser && isValidSort
        ? involves(user, absoluteTime, excludeUser, sort)
        : console.log(INVOLVES_USAGE);
    },
    "open-graph": ([user, repo]) => {
      user && repo ? openGraph(user, repo) : console.log(OPEN_GRAPH_USAGE);
    },
  }[subcommandName] ?? _help();
subcommand(args);
