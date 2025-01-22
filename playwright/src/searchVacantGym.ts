import { chromium } from "playwright";

const USER_ID = process.env.USER_ID;
const PASSWORD = process.env.PASSWORD;

if (!USER_ID || !PASSWORD) {
  throw new Error(
    `環境変数が設定されていません。 USER_ID: ${USER_ID}, PASSWORD: ${PASSWORD}`
  );
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
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto("https://setagaya.keyakinet.net/Web/Home/WgR_ModeSelect");
    await page.locator("#head").getByRole("link", { name: "ログイン" }).click();
    await page.locator("#userID").fill(USER_ID ?? '');
    await page.locator("#passWord").fill(PASSWORD ?? '');
    await page.getByRole("link", { name: "ログイン" }).click();
    await page.getByRole("link", { name: " 一覧から探す" }).click();
    await page.getByRole("button", { name: "お気に入りの施設" }).click();

    const schools = [
      "砧小学校", "経堂小学校", "桜丘小学校", "笹原小学校", 
      "祖師谷小学校", "塚戸小学校", "山野小学校", 
      "砧中学校", "桜丘中学校"
    ];
    
    for (const school of schools) {
      await page.getByRole("cell", { name: school }).locator("label").click();
    }

    await page.getByRole("link", { name: "次へ進む" }).click();
    await page.waitForURL("https://setagaya.keyakinet.net/Web/Yoyaku/WgR_ShisetsubetsuAkiJoukyou");

    // テーブルごとに処理
    const tables = await page.locator('table.calendar').all();
    for (const table of tables) {
      // 施設名を取得（テーブルの前にある最も近いh3から）
      const facilityName = await table.evaluate(el => {
        const h3 = el.closest('.item')?.querySelector('h3 a')?.textContent;
        return h3 || "不明な施設";
      });

      // 体育館の行を探す
      const rows = await table.locator('tbody tr').all();
      for (const row of rows) {
        const facilityType = await row.locator('.shisetsu').textContent();
        
        if (facilityType?.includes('音楽室')) {
          const labels = await row.locator('label').all();
          for (const [index, label] of labels.entries()) {
            const status = await label.textContent();
            
            if (status === '△') {
              const checkbox = await row.locator('input').nth(index);
              const value = await checkbox.getAttribute('value');
              
              if (value) {
                const date = value.substring(0, 8);
                const formattedDate = `${date.substring(0, 4)}/${date.substring(4, 6)}/${date.substring(6, 8)}`;
                console.log(`所属施設: ${facilityName}, 施設: ${facilityType.trim()}, 予約可能日: ${formattedDate}`);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("エラーが発生しました:", error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);