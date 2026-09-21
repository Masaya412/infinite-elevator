# Infinite Elevator

TypeScript + Next.js + Chakra UI で作成した「無限エレベーター」です。

## ローカル起動

```bash
npm install
npm run dev
```

`http://localhost:3000` を開いてください。

## GitHub Pages への公開

このプロジェクトは GitHub Actions から GitHub Pages に自動デプロイできるよう設定済みです。
リポジトリ名は Actions 実行時に自動検出されるため、通常は `next.config.mjs` の `basePath` を手動変更する必要はありません。

### 1. GitHubへpush

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_NAME/YOUR_REPOSITORY.git
git push -u origin main
```

### 2. GitHub Pagesを有効化

GitHubのリポジトリで:

1. `Settings`
2. `Pages`
3. `Build and deployment`
4. `Source` を **GitHub Actions** にする

その後、`Actions` タブの `Deploy Next.js to GitHub Pages` が成功すれば公開されます。

## 注意

- `node_modules`、`.next`、`out`、`.env*` はGit管理対象外です。
- Pages用ビルドでは `output: 'export'` を使用します。
- 通常のプロジェクトPages (`https://username.github.io/repository/`) ではリポジトリ名を自動で `basePath` に設定します。
- `username.github.io` リポジトリの場合はルート (`/`) として公開します。


## 効果音

この版では Web Audio API を使って外部音源ファイルなしで効果音を生成します。
通常クリック、ゲーム開始、エレベーター扉、上昇演出4段階、到着、アイテム、購入・売却、採掘、宝石、ブラックジャック、スロット、ジャックポット、ワープ、究極ルーレット、地獄、成功・失敗、ゲームオーバー等に個別の効果音を割り当てています。右上のスピーカーボタンで効果音をON/OFFできます。
