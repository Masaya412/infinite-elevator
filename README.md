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

## v7 changes
- Inventory cards now use high-contrast text and icons at all times.
- Blackjack HIT results show the drawn card and final hand total; bust explicitly shows that the total exceeded 21.
- Magic Forge can be used only once per visit. After one upgrade, the room shows that upgrading is complete.

## v12 updates
- ミステリーオークションの購入ボタンを中央配置。
- 落札後の結果に「当たり」ではなく、獲得した商品名を表示。

## v18 演出アップデート
- 地獄の門: 脱出条件・成功率・残り回数を表示し、サイコロの高速抽選→確定演出を追加。
- BGM: Web Audio APIで生成する軽量BGMを追加。通常Tier、カジノ、地下カードサロン、神秘系、地獄で曲調が切り替わります。
- エレベーター: 上昇階数の高速抽選、Tier別CHANCE演出、OVERDRIVE激熱表示、最終値ロック演出を追加。

## v19 changes
- 宝石はショップ系の部屋でのみ売却可能
- 2つの扉を6種類へ拡張
- エレベーター演出をNORMAL開始→昇格抽選方式へ変更
- 乱反射の鏡の「素の上昇値→倍率→最終値」専用演出を追加
