const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
require("dotenv").config();

puppeteer.use(StealthPlugin());

const url = "https://x.com/i/flow/login";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const autoScroll = async (page) => {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 30; // Distance to scroll each time
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= 2500) {
            clearInterval(timer);
            resolve();
          }
        }, 500); // Speed of the scroll (milliseconds between scrolls)
      });
    });
  };

const main = async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();clearImmediate
    await page.goto(url, { waitUntil: "networkidle2" });
    // Login process for X (Twitter)
    await page.waitForSelector('input[name="text"]');
    await page.type('input[name="text"]', process.env.TwitUser);
    await wait(2000);

    await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')];
      const nextButton = buttons.find(button => button.innerText === 'Next');
      if (nextButton) {
        nextButton.click();
      }
    });
    await page.waitForSelector('input[name="password"]');
    await page.type('input[name="password"]', process.env.TwitPassword); 
    await wait(2000);
    await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')];
      const loginButton = buttons.find(button => button.innerText === 'Log in');
      if (loginButton) {
        loginButton.click();
      }
    });

    await page.waitForNavigation({ waitUntil: "networkidle2" });

    // Handle popups if necessary
    // try {
    //   await page.waitForSelector('div[role="button"]', { timeout: 5000 });
    //   await page.evaluate(() => {
    //     const buttons = document.querySelectorAll('div[role="button"]');
    //     for (const button of buttons) {
    //       if (button.textContent.includes("Not Now") || button.textContent.includes("Skip")) {
    //         button.click();
    //         break;
    //       }
    //     }
    //   });
    // } catch (error) {
    //   console.log("Popups handled or none appeared.");
    // }
    await autoScroll(page);
    await wait(3000);
    await page.screenshot({ path: 'x_login.png', fullPage: true });
    console.log("Login successful!");
    await page.goto(`https://x.com/${process.env.TwitUser}`, { waitUntil: "networkidle2" });
    await wait(1800);
    await page.screenshot({ path: 'x_profile.png', fullPage: true });
    console.log("Profile page screenshot taken!");
    await page.goto(`https://x.com/${process.env.TwitUser}/following`, { waitUntil: "networkidle2" });
    console.log(`Navigated to following`);

    await autoScroll(page);

    const usernames1 = await page.$$eval('[data-testid="UserCell"] a[href*="/"]', links =>
      links.map(link => link.getAttribute('href').replace('/', ''))
    );
    const usernames = [...new Set(usernames1)];

    console.log("User is following these accounts:");
    usernames.forEach((username, index) => {
      console.log(`${index + 1}. ${username}`);
    });
  } catch (error) {
    console.error("Error during login: ", error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

main();
