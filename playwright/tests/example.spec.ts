import { test } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://setagaya.keyakinet.net/Web/Home/WgR_ModeSelect');
  await page.locator('#head').getByRole('link', { name: 'ログイン' }).click();
  await page.locator('#userID').click();
  await page.locator('#userID').click();
  await page.locator('#userID').fill('20326786');
  await page.locator('#passWord').click();
  await page.locator('#passWord').fill('Sk62449979');
  await page.getByRole('link', { name: 'ログイン' }).click();
  await page.getByRole('link', { name: ' 一覧から探す' }).click();
  await page.getByRole('button', { name: 'お気に入りの施設' }).click();
  await page.getByRole('cell', { name: '砧小学校' }).locator('label').click();
  await page.getByRole('cell', { name: '経堂小学校' }).locator('label').click();
  await page.getByRole('cell', { name: '桜丘小学校' }).locator('label').click();
  await page.getByRole('cell', { name: '笹原小学校' }).locator('label').click();
  await page.getByRole('cell', { name: '祖師谷小学校' }).locator('label').click();
  await page.getByRole('cell', { name: '塚戸小学校' }).locator('label').click();
  await page.getByRole('cell', { name: '山野小学校' }).locator('label').click();
  await page.getByRole('cell', { name: '砧中学校' }).locator('label').click();
  await page.getByRole('cell', { name: '桜丘中学校' }).locator('label').click();
  await page.getByRole('link', { name: '次へ進む' }).click();
  await page.goto('https://setagaya.keyakinet.net/Web/Yoyaku/WgR_ShisetsubetsuAkiJoukyou');

  import { test } from '@playwright/test';

test('test', async ({ page }) => {
  // ... 既存のコード ...

  await page.goto('https://setagaya.keyakinet.net/Web/Yoyaku/WgR_ShisetsubetsuAkiJoukyou');

  // 体育館の行を探し、△マークとその日付を確認
  const rows = await page.locator('tr').all();

  for (const row of rows) {
    // 行内のテキストを取得
    const facilityText = await row.locator('.shisetsu').textContent();

    // 体育館という文字を含む行のみ処理
    if (facilityText && facilityText.includes('体育館')) {
      // その行内のすべてのラベルを取得
      const labels = await row.locator('label').all();

      for (const label of labels) {
        const status = await label.textContent();

        // △マークを見つけた場合
        if (status === '△') {
          // 対応するcheckboxのvalueから日付を抽出
          const checkbox = await label.locator('xpath=../input').first();
          const value = await checkbox.getAttribute('value');
          const date = value ? value.substring(0, 8) : ''; // YYYYMMDD形式で取得

          // 日付を整形（YYYY/MM/DD形式に変換）
          const formattedDate = `${date.substring(0, 4)}/${date.substring(4, 6)}/${date.substring(6, 8)}`;

          console.log(`施設: ${facilityText.trim()}, 予約可能日: ${formattedDate}`);
        }
      }
    }
  }
});
});
