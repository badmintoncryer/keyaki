import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

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
    headless: true,
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
    await page.getByRole("link", { name: " 一覧から探す" }).click();
    await page.getByRole("button", { name: "お気に入りの施設" }).click();

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
    await page.getByText("ヶ月").click();
    await page.getByRole("button", { name: " 表示" }).click();
    await page.goto(
      "https://setagaya.keyakinet.net/Web/Yoyaku/WgR_ShisetsubetsuAkiJoukyou"
    );

    const tables = await page.locator("table.calendar").all();
    for (const table of tables) {
      const facilityName = await table.evaluate((el) => {
        const h3 = el.closest(".item")?.querySelector("h3 a")?.textContent;
        return h3 || "不明な施設";
      });

      const rows = await table.locator("tbody tr").all();
      for (const row of rows) {
        const facilityType = await row.locator(".shisetsu").textContent();

        if (facilityType?.includes("体育")) {
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

      // Git操作
      const branchName = `update-reservations-${
        new Date().toISOString().split("T")[0]
      }`;

      await execAsync('git config --global user.name "github-actions[bot]"');
      await execAsync(
        'git config --global user.email "github-actions[bot]@users.noreply.github.com"'
      );
      const repoUrl = `https://x-access-token:${GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
      await execAsync(`git remote set-url origin ${repoUrl}`);
      await execAsync(`git checkout -b ${branchName}`);
      await execAsync("git add data/");
      await execAsync('git commit -m "Update reservations"');
      await execAsync(`git push origin ${branchName}`);

      // Pull Request作成
      const prUrl = `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/pulls`;
      const prBody = {
        title: "予約情報の更新",
        body: "予約可能な体育館の情報が更新されました",
        head: branchName,
        base: "main",
      };

      await fetch(prUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prBody),
      });
    }
  } catch (error) {
    console.error("エラーが発生しました:", error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
