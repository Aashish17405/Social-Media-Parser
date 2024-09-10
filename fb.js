require('dotenv').config();
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const readline = require("readline");

puppeteer.use(StealthPlugin());

const url = "https://www.facebook.com/";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

const main = async () => {
  let browser;

  try {
    // Launch browser with notification permissions set to "denied"
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--disable-notifications', // Disables browser-level notifications
      ],
    });
    const page = await browser.newPage();

    // Navigate to Facebook
    await page.goto(url, { waitUntil: "networkidle2" });
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', process.env.FB_USERNAME);
    await page.waitForSelector('input[name="pass"]');
    await page.type('input[name="pass"]', process.env.FB_PASSWORD);
    await wait(1000);
    await page.click('button[name="login"]');
    await wait(5000);

    // Wait for potential 2FA prompt
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    // Check for 2FA input field
    const twoFaSelector = 'input[name="approvals_code"]';
    const twoFaExists = await page.$(twoFaSelector);

    if (twoFaExists) {
      console.log("2FA code required.");
      const twoFaCode = await askQuestion("Enter your 2FA code: ");
      await page.type(twoFaSelector, twoFaCode);
      await page.click('button[name="checkpoint_submit_button"]');
      await page.waitForNavigation({ waitUntil: "networkidle2" });

      // After entering the 2FA code, check if the "Trust This Device" prompt appears
      const trustDeviceSelector = 'input[name="name_action_selected"]'; // Selector for "Trust This Device"
      const trustDeviceExists = await page.$(trustDeviceSelector);

      if (trustDeviceExists) {
        console.log("Trust this device option found, selecting it...");
        await page.click(trustDeviceSelector); // Click the checkbox or radio button to trust the device
        await page.click('button[name="checkpoint_submit_button"]'); // Submit the form to confirm
        await page.waitForNavigation({ waitUntil: "networkidle2" });
        console.log("Device trusted.");
      } else {
        console.log("No 'Trust This Device' prompt appeared.");
      }
    }

    // Screenshot of the home page
    await wait(4000);
    await page.screenshot({ path: 'fb_homepage.png', fullPage: true });
    console.log("Screenshot saved as fb_homepage.png");

    // Navigate to Profile Page
    await page.goto('https://www.facebook.com/me', { waitUntil: "networkidle2" });

    // Wait for a different selector on the profile page
    try {
      await page.waitForSelector('div[data-pagelet="ProfileTimeline"]');
    } catch (error) {
      console.warn("Profile timeline not immediately available. Proceeding anyway.");
    }

    await wait(2000);

    // Screenshot of the profile page
    await page.screenshot({ path: 'fb_profilepage.png', fullPage: true });
    console.log("Screenshot saved as fb_profilepage.png");

    // Navigate to Facebook Messenger
    await page.goto("https://www.facebook.com/messages/t", { waitUntil: "networkidle2" });
    console.log("Navigated to the Messenger section");
    await wait(1000);
    await page.waitForSelector('div[role="row"]', { timeout: 30000 });

    // Extract recent chat usernames
    const recentChats = await page.evaluate(() => {
      const chatItems = document.querySelectorAll('div[role="row"]');
      return Array.from(chatItems).slice(0, 5).map(item => { // Adjust the number to get more or fewer recent usernames
        const usernameElement = item.querySelector('span.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft.xh894vf');
        return usernameElement ? usernameElement.textContent.trim() : 'Unknown';
      });
    });

    // Print out the recent chat usernames
    console.log("Top recent chat usernames:");
    recentChats.forEach((username, index) => {
      console.log(`${index + 1}. ${username}`);
    });

    // Click on a specific person's chat
    const chatWithPersonClicked = await page.evaluate(() => {
      const chatItems = document.querySelectorAll('div[role="row"]');
      for (const item of chatItems) {
        const usernameElement = item.querySelector('span.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft');
        if (usernameElement && usernameElement.textContent.trim() === "Kavade Anjali") { // Change this to the specific username
          item.click();
          return true;
        }
      }
      return false;
    });

    await wait(1000);

    if (chatWithPersonClicked) {
      await page.waitForSelector('div[role="row"]', { timeout: 30000 });
      console.log("Chat with Kavade Anjali is now open");

      // Extract chat messages
      const messages = await page.evaluate(() => {
        const messageRows = document.querySelectorAll('div[role="row"]');
        return Array.from(messageRows).map(row => {
          const senderElement = row.querySelector('h5 span.xzpqnlu, h4 span.xzpqnlu');
          const contentElement = row.querySelector('div[dir="auto"]');
          let sender = 'Kavade Anjali';
          let content = '';
          if (senderElement) {
            sender = senderElement.textContent.trim();
          } else if (row.querySelector('h5 span:not(.xzpqnlu)')) {
            sender = 'Target';
          }

          if (contentElement) {
            content = contentElement.textContent.trim();
          }

          return { sender, content };
        }).filter(message => message.content !== '' && !message.content.includes('Enter'));
      });

      // Log the extracted messages
      console.log(`Number of messages found: ${messages.length}`);
      console.log("Chat messages:");
      messages.forEach((message, index) => {
        console.log(`${index + 1}. ${message.sender}: ${message.content}`);
      });

    } else {
      console.log("Couldn't find a chat with Kavade Anjali");
    }

  } catch (error) {
    console.error("Error occurred:", error);
  } finally {
    if (browser) {
      await browser.close();
      rl.close();
    }
  }
};

main();
