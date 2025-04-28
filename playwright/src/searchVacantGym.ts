import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import dotenv from "dotenv";
dotenv.config();

const execAsync = promisify(exec);
const USER_ID = process.env.USER_ID;
const PASSWORD = process.env.PASSWORD;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

interface Reservation {
  schoolName: string;
  date: string;
}

async function main() {
  const browser = await chromium.launch({
    headless: false,
    args: [
      "--single-process",
      "--window-size=1920,1080",
      "--use-angle=swiftshader",
      "--disable-setuid-sandbox",
      "--no-sandbox",
    ],
  });

  let newReservations: Reservation[] = [];
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://setagaya.keyakinet.net/Web/Home/WgR_ModeSelect");
    await page.locator("#head").getByRole("link", { name: "ログイン" }).click();
    await page.locator("#userID").fill(USER_ID ?? "");
    await page.locator("#passWord").fill(PASSWORD ?? "");
    await page.getByRole("link", { name: "ログイン" }).click();
    // Check if the "メッセージ" heading exists
    const messageHeadingExists = await page
      .getByRole("heading", { name: "メッセージ" })
      .isVisible()
      .catch(() => false); // Handle case where element doesn't exist
    // If the heading exists, click the link with empty name
    console.log(
      `メッセージの見出しが${messageHeadingExists ? "存在" : "存在しません"}`)
    if (messageHeadingExists) {
      await page.locator('div[data-remodal-id="loginInfo"]').waitFor({ state: 'visible' });
      await page.locator('div[data-remodal-id="loginInfo"] a.remodal-close').click();
    }
    await page.getByRole("link", { name: " 一覧から探す" }).click();
    await page.getByRole("button", { name: "お気に入りの施設" }).click();
    // 8回クリック
    for (let i = 0; i < 8; i++) {
      await page
        .getByRole("link", { name: "さらに読み込む" })
        .click({ timeout: 3_000 });
      console.log("さらに読み込むをクリックしました。");
    }

    const schools = [
      // Community centers
      "宮坂区民センター",
      "守山地区会館",

      // Elementary schools (小学校)
      "赤堤小学校",
      "旭小学校",
      "池尻小学校",
      "池之上小学校",
      "奥沢小学校",
      "上北沢小学校",
      "烏山小学校",
      "烏山北小学校",
      "喜多見小学校",
      "砧南小学校",
      "砧小学校",
      "希望丘小学校",
      "給田小学校",
      "経堂小学校",
      "駒沢小学校",
      "駒繋小学校",
      "桜小学校",
      "桜町小学校",
      "桜丘小学校",
      "笹原小学校",
      "三軒茶屋小学校",
      "下北沢小学校",
      "城山小学校",
      "瀬田小学校",
      "世田谷小学校",
      "祖師谷小学校",
      "太子堂小学校",
      "玉川小学校",
      "玉堤小学校",
      "多聞小学校",
      "代沢小学校",
      "千歳小学校",
      "千歳台小学校",
      "塚戸小学校",
      "弦巻小学校",
      "等々力小学校",
      "中里小学校",
      "中町小学校",
      "中丸小学校",
      "八幡山小学校",
      "東玉川小学校",
      "東深沢小学校",
      "深沢小学校",
      "二子玉川小学校",
      "船橋小学校",
      "松丘小学校",
      "松沢小学校",
      "松原小学校",
      "三宿小学校",
      "武蔵丘小学校",
      "明正小学校",
      "八幡小学校",
      "山崎小学校",
      "山野小学校",
      "用賀小学校",
      "芦花小学校",
      "若林小学校",

      // Junior high schools (中学校)
      "梅丘中学校",
      "奥沢中学校",
      "上祖師谷中学校",
      "烏山中学校",
      "北沢中学校",
      "喜多見中学校",
      "砧中学校",
      "砧南中学校",
      "駒沢中学校",
      "駒留中学校",
      "桜丘中学校",
      "桜木中学校",
      "瀬田中学校",
      "世田谷中学校",
      "太子堂中学校",
      "玉川中学校",
      "千歳中学校",
      "弦巻中学校",
      "東深沢中学校",
      "深沢中学校",
      "富士中学校",
      "船橋希望中学校",
      "松沢中学校",
      "三宿中学校",
      "緑丘中学校",
      "八幡中学校",
      "用賀中学校",
      "芦花中学校",

      // Gymnasium
      "池尻２丁目体育館",
    ];

    for (const school of schools) {
      try {
        await page.getByRole("cell", { name: school }).locator("label").click({
          timeout: 3_000,
        });
      } catch (error) {
        // do nothing
        console.warn(
          `施設名「${school}」が見つかりませんでした。エラー: ${error}`
        );
        continue;
      }
    }

    await page
      .getByRole("link", { name: "次へ進む" })
      .click({ timeout: 300_000 });
    await page.waitForURL(
      "https://setagaya.keyakinet.net/Web/Yoyaku/WgR_ShisetsubetsuAkiJoukyou",
      { timeout: 300_000 }
    );
    await page.getByText("ヶ月").click();
    await page
      .getByRole("button", { name: " 表示" })
      .click({ timeout: 300_000 });
    // await page.goto(
    //   "https://setagaya.keyakinet.net/Web/Yoyaku/WgR_ShisetsubetsuAkiJoukyou"
    // );

    const tables = await page.locator("table.calendar").all();
    for (const table of tables) {
      const facilityName = await table.evaluate((el) => {
        const h3 = el.closest(".item")?.querySelector("h3 a")?.textContent;
        return h3 || "不明な施設";
      });

      const rows = await table.locator("tbody tr").all();
      for (const row of rows) {
        const facilityType = await row.locator(".shisetsu").textContent();

        if (
          facilityType?.includes("体育") ||
          facilityType?.includes("多目的室")
        ) {
          const labels = await row.locator("label").all();
          for (const [index, label] of labels.entries()) {
            const status = await label.textContent();

            if (status === "△") {
              const checkbox = await row.locator("input").nth(index);
              const value = await checkbox.getAttribute("value");

              if (value) {
                const date = value.substring(0, 8);
                newReservations.push({
                  schoolName: facilityName,
                  date,
                });
              }
            }
          }
        }
      }
    }

    // JSONファイルの保存先パス
    const outputPath = path.join(__dirname, "../data/reservations.json");

    // 既存のJSONを読み込む
    let existingReservations: Reservation[] = [];
    let hasChanges = false;

    try {
      const data = fs.readFileSync(outputPath, "utf8");
      existingReservations = JSON.parse(data);
      hasChanges =
        JSON.stringify(existingReservations.sort()) !==
        JSON.stringify(newReservations.sort());
    } catch (error) {
      console.log("既存の予約ファイルが見つかりません。新規作成します。");
      hasChanges = true;
    }

    if (hasChanges) {
      // dataディレクトリがない場合は作成
      const dataDir = path.dirname(outputPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // 新しい予約情報を保存
      fs.writeFileSync(outputPath, JSON.stringify(newReservations, null, 2));
    }
  } catch (error) {
    console.error("エラーが発生しました:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
