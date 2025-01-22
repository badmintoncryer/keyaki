import { chromium } from "playwright";
import { Handler } from "aws-lambda";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const USER_ID = process.env.KEYAKI_USER_ID;
const PASSWORD = process.env.KEYAKI_PASSWORD;
const TOPIC_ARN = process.env.TOPIC_ARN;

if (!USER_ID || !PASSWORD || !TOPIC_ARN) {
  throw new Error(
    `環境変数が設定されていません。 USER_ID: ${USER_ID}, PASSWORD: ${PASSWORD}, TOPIC_ARN: ${TOPIC_ARN}`
  );
}

const snsClient = new SNSClient({});

export const handler: Handler = async (_event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  console.log("Start search vacant gym");

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: "/browser/chrome",
      args: [
        "--single-process",
        "--window-size=1920,1080",
        "--use-angle=swiftshader",
        "--disable-setuid-sandbox",
        "--no-sandbox",
      ],
    });
    console.log("Browser launched");

    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(30000);

    // ログインとナビゲーション
    await page.goto("https://setagaya.keyakinet.net/Web/Home/WgR_ModeSelect");
    await page.locator("#head").getByRole("link", { name: "ログイン" }).click();
    await page.locator("#userID").fill(USER_ID);
    await page.locator("#passWord").fill(PASSWORD);
    await page.getByRole("link", { name: "ログイン" }).click();
    await page.getByRole("link", { name: " 一覧から探す" }).click();
    await page.getByRole("button", { name: "お気に入りの施設" }).click();

    // 施設選択
    const schools = [
      "砧小学校",
      "経堂小学校",
      "桜丘小学校",
      "笹原小学校",
      "祖師谷小学校",
      "塚戸小学校",
      "山野小学校",
      "砧中学校",
      "桜丘中学校",
    ];

    for (const school of schools) {
      await page.getByRole("cell", { name: school }).locator("label").click();
    }

    await page.getByRole("link", { name: "次へ進む" }).click();
    await page.waitForURL(
      "https://setagaya.keyakinet.net/Web/Yoyaku/WgR_ShisetsubetsuAkiJoukyou"
    );

    // テーブルごとに処理
    const results = [];
    const tables = await page.locator("table.calendar").all();

    for (const table of tables) {
      const facilityName = await table.evaluate((el) => {
        const h3 = el.closest(".item")?.querySelector("h3 a")?.textContent;
        return h3 || "不明な施設";
      });

      const rows = await table.locator("tbody tr").all();
      for (const row of rows) {
        const facilityText = await row.locator(".shisetsu").textContent();

        if (facilityText?.includes("体育館")) {
          const labels = await row.locator("label").all();
          for (const [index, label] of labels.entries()) {
            const status = await label.textContent();

            if (status === "△") {
              const checkbox = await row.locator("input").nth(index);
              const value = await checkbox.getAttribute("value");
              if (value) {
                const date = value.substring(0, 8);
                const formattedDate = `${date.substring(0, 4)}/${date.substring(
                  4,
                  6
                )}/${date.substring(6, 8)}`;
                results.push({
                  facilityName,
                  facilityDetail: facilityText.trim(),
                  availableDate: formattedDate,
                });
              }
            }
          }
        }
      }
    }

    if (results.length > 0) {
      const message = results
        .map(
          (result) =>
            `施設: ${result.facilityName}\n詳細: ${result.facilityDetail}\n予約可能日: ${result.availableDate}\n`
        )
        .join("\n");

      const publishCommand = new PublishCommand({
        TopicArn: TOPIC_ARN,
        Subject: "体育館の空き状況が見つかりました",
        Message: message,
      });

      await snsClient.send(publishCommand);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        results,
        notificationSent: results.length > 0,
      }),
    };
  } catch (error: any) {
    // const errorMessage = `体育館空き状況チェック中にエラーが発生しました:\n${error.message}`;

    // try {
    //   const publishCommand = new PublishCommand({
    //     TopicArn: TOPIC_ARN,
    //     Subject: "体育館空き状況チェックエラー",
    //     Message: errorMessage,
    //   });

    //   await snsClient.send(publishCommand);
    // } catch (snsError) {
    //   console.error("SNS通知送信中にエラーが発生しました:", snsError);
    // }

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
