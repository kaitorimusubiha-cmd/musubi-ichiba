# デプロイ手順（エンジニア向け）

## 初回デプロイ手順

### 1. D1データベースを作成
```bash
wrangler d1 create musubi-ichiba-db
```
→ 表示された `database_id` を `wrangler.jsonc` の `XXXXXXXX-...` 部分に貼り付ける

### 2. テーブルを作成
```bash
wrangler d1 execute musubi-ichiba-db --file=schema.sql
```

### 3. Claude APIキーを Secrets に登録
```bash
wrangler secret put CLAUDE_API_KEY
```
→ プロンプトに Anthropic の APIキーを貼り付ける

### 4. ビルド & デプロイ
```bash
npm install
npm run deploy
```

### 5. Cloudflare Access を設定
Cloudflareダッシュボード → Zero Trust → Access → Applications から:
- Application type: Self-hosted
- Domain: デプロイされたURLを設定
- Policy: 許可するメールアドレスを指定

---

## ローカル開発

OCR機能のみローカルでテストできます。

1. `.env.example` を `.env.local` にコピー
2. `CLAUDE_API_KEY` に実際のAPIキーを設定
3. `npm run dev` で起動（http://localhost:3000）

※ 台帳機能（データ保存・一覧）はデプロイ後のみ動作します。
