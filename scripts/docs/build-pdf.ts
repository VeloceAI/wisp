// Prints docs/guide/guide.html to docs/Wisp-Guide.pdf with the local Chrome: npm run docs:pdf
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.goto(pathToFileURL(resolve('docs/guide/guide.html')).href, { waitUntil: 'load' });
await page.pdf({ path: 'docs/Wisp-Guide.pdf', format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('docs/Wisp-Guide.pdf written');
