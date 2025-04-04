## ローカル実行

```ts
async function main() {
  const browser = await chromium.launch({
    headless: false, // falseにするとブラウザが表示される
    args: [
      "--single-process",
      "--window-size=1920,1080",
      "--use-angle=swiftshader",
      "--disable-setuid-sandbox",
      "--no-sandbox",
    ],
  });
```

```bash
npx ts-node src/searchVacantGym.ts
```

ブラウザ操作からコード生成したい場合は`npx playwright codegen`を使う。
