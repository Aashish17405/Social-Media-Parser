const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
require("dotenv").config();

puppeteer.use(StealthPlugin());

const url = "https://groww.in/";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Set longer timeouts for page.goto and waitForNavigation
    await page.goto(url + "/login", { waitUntil: "networkidle2", timeout: 60000 });

    // Click the "Login/Register" button
    await page.waitForSelector('button[class*="mint-btn-default"]', { timeout: 10000 });
    await page.click('button[class*="mint-btn-default"]');

    // Type in the username (email)
    await page.waitForSelector('#login_email1', { timeout: 10000 });
    await page.type('#login_email1', process.env.GROW_USERNAME); // Type username

    await page.waitForSelector('button[class*="mint-btn-default"]', { timeout: 10000 });
    await page.click('button[class*="mint-btn-default"]');

    await page.waitForSelector('#login_password1', { timeout: 10000 });
    await page.type('#login_password1', process.env.GROW_PASSWORD); // Type password

    await page.waitForSelector('button[class*="mint-btn-default"]', { timeout: 10000 });
    await page.click('button[class*="mint-btn-default"]');

    // Wait for navigation or specific element after login form submission
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });

    // Check for OTP input field
    let otpRequired = false;
    try {
      // Wait for OTP input fields to appear
      await page.waitForSelector('input[type="number"][maxlength="1"]', { timeout: 50000 });
      otpRequired = true;
      console.log("2FA is enabled. Please enter the OTP manually in the browser window.");

      // Wait until the user enters all 6 digits of the OTP
      await page.waitForFunction(
        () => {
          const inputs = document.querySelectorAll('input[type="number"][maxlength="1"]');
          return Array.from(inputs).every(input => input.value.length === 1);
        },
        { timeout: 60000 } // Wait up to 60 seconds for user input
      );

      console.log("User has entered the OTP. Continuing the process...");

      // Now Puppeteer types the pin '0405' into each of the input fields
      await page.waitForSelector('input.otpinput88confidential', { timeout: 10000 });

      // Select all OTP input fields
      const pinFields = await page.$$('input.otpinput88confidential');

      if (pinFields.length === 4) {
        // Type the pin '0405' into the input fields
        await pinFields[0].type('1');
        await pinFields[1].type('2');
        await pinFields[2].type('8');
        await pinFields[3].type('9');

        console.log("PIN 0405 has been entered.");
      } else {
        console.error("PIN fields not found or incorrect number of PIN fields.");
      }

    } catch (error) {
      console.log("No OTP detected or error in OTP entry, continuing login process...");
    }
    await wait(4000);
    await page.screenshot({ path: 'Growwdashboard.png', fullPage: true });

    await wait(1000);
    await page.waitForSelector('.loggedin-header-left-nav a[href="/stocks/user/investments"]', { timeout: 10000 });
    await page.click('.loggedin-header-left-nav a[href="/stocks/user/investments"]');
    await wait(2000);
    await page.screenshot({ path: 'GrowwInvestments.png', fullPage: true });
    await wait(1000);
    await page.waitForSelector('.valign-wrapper.dashboardTabsText.bodyXLarge');
    await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('.valign-wrapper.dashboardTabsText.bodyXLarge'));
        const mutualFundsTab = elements.find(el => el.textContent.includes('Mutual Funds'));
        if (mutualFundsTab) {
            mutualFundsTab.click();
        }
    });
    await wait(2000);
    // await page.goto(url + "/mutual-funds/user/investments", { waitUntil: "networkidle2", timeout: 60000 });
    // await wait(2000);
    await page.screenshot({ path: 'GrowwMutualFunds.png', fullPage: true });
  } catch (error) {
    console.error("Error occurred:", error);
  } finally {
    if (browser) {
      await browser.close(); // Close the browser after execution
    }
    console.log("Script completed. Exiting now.");
    process.exit(0); // Exit the script
  }
};

main();
