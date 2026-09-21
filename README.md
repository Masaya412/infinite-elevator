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


## v20 updates
- 2つの扉は6候補から毎回ランダムで2種類のみ出現します。
- 右上の ×1 / ×2 で演出速度を切り替えられます。ブラックジャック、スロット、占い、ルーレット、地獄などの待ち時間にも反映されます。

## Firebase 全国ランキング設定

この版は Firebase Authentication（匿名ログイン）+ Cloud Firestore のオンラインランキングに対応しています。Firebase設定が無い場合だけローカルランキングへフォールバックします。

### 1. Firebaseプロジェクトを作る

Firebase Console でプロジェクトを作成し、Webアプリを追加してください。表示された `firebaseConfig` の値を使います。

### 2. Anonymous Authenticationを有効化

Firebase Console → Authentication → Sign-in method → Anonymous を有効にします。

### 3. Cloud Firestoreを作る

Firebase Console → Firestore Database → データベースを作成します。本番運用ではルールを開放したままにしないでください。

このプロジェクトの `firestore.rules` の内容を Firebase Console → Firestore Database → Rules に貼り付けて「公開」してください。

ランキングデータは次のコレクションへ保存されます。

```text
rankings/{auto-document-id}
```

### 4. GitHub Actions Variablesを登録

GitHubの対象リポジトリで

`Settings → Secrets and variables → Actions → Variables → New repository variable`

を開き、以下6つを登録します。

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

値はFirebase Console → Project settings → Your apps → Web app の `firebaseConfig` からコピーします。

登録後、mainへpushするとGitHub ActionsがFirebase設定込みでNext.jsをビルドします。

### 5. ローカルで確認する場合

`.env.example` を `.env.local` にコピーしてFirebaseの値を入れます。

```bash
cp .env.example .env.local
npm install
npm run dev
```

`.env.local` は `.gitignore` 対象なのでGitHubへコミットしないでください。

### ランキング仕様

- Top 50をスコア（到達階）降順でリアルタイム表示
- ゲーム終了画面からニックネームとスコアを登録
- 匿名Firebase Authenticationで書き込みユーザーを識別
- 読み取りは公開、追加は認証済みユーザーのみ
- ランキングの更新は禁止。削除はTop 50整理のため匿名認証済みクライアントに許可
- Firebase未設定時はlocalStorageランキングへフォールバック

## v22 gameplay adjustments
- Inventory overflow now opens a 4-item discard chooser (3 held + newly acquired item).
- Mystery Auction rewards: Ruby x3 / Emerald x3 / Diamond x3 / Mirror ★5-8 / Lucky Ring ★5-15.
- Mining gem rate reduced to 55%; most finds are 1 gem, occasionally 2.
- Forge caps: Mirror ★8, Lucky Ring ★15, Money Tree ★3, Happiness Charm ★3.
- Barter exchange for +1 turn now costs 600 yen.

## v23: イベント変更

- 宝石採掘場: 2回掘り終えると、選ばなかった3つの岩の中身も薄く表示して公開します。入手できるのは実際に選んで掘った岩の宝石だけです。
- 運試しの祭壇: `運気 / 階数 / 金運 / 健康運` の4つから1回だけ祈れます。成功率は30%です。
- 占い師の小部屋: 「占ってもらう」を押すと演出後に `大吉〜大凶` の運勢とコメント、運気の増減が表示されます。

## ランキングを無料でTop 50だけに保つ仕組み

この版では Cloud Functions を使いません。Spark無料プランのまま、ランキング登録後にブラウザ側でFirestoreをスコア順に読み直し、51位以下を削除します。

### 必須: Firestore Rulesを更新

`firestore.rules` を Firebase Console → Firestore Database → Rules に貼り付けて公開してください。

この無料方式では、匿名認証済みユーザーに `rankings` の削除権限を与える必要があります。そのため Cloud Functions版より改ざん耐性は低くなります。まず無料で運用したい場合向けの構成です。

### Cloud Functionsは不要

`functions/` フォルダは削除済みです。Blazeプランへの変更や `firebase deploy --only functions` は不要です。

Firestore Rulesだけデプロイする場合は次でOKです。

```bash
firebase deploy --only firestore:rules
```

GitHub Pages側はこれまで通り `git push` で更新できます。


## v25: 旧 Cloud Functions フォルダの削除

無料 Top 50 版では `functions/` は不要です。以前の版からGitHubリポジトリを更新している場合、古い `functions/` が追跡されたまま残ることがあります。

```bash
git rm -r functions
git add tsconfig.json
git commit -m "Remove old Firebase Functions"
git push origin main
```

`tsconfig.json` でも `functions` を型チェック対象外にしてあるため、旧フォルダがローカルに残っていても Next.js のビルド対象にはなりません。

## v26 visual update
- Removed the Time Capsule room from Tier 4.
- Slower slot reel stopping and a dedicated REACH animation when the first two symbols match.
- Richer Tier 5 / God Home BGM generated with Web Audio.
- Tier 4/5 arrival effects.
- Event-specific room backgrounds (casino, mining, fortune, altar, warp, forge, shops, God Home, hell, etc.).

## v29 changes
- ルーレット絵柄3つ揃い時、10〜50倍の倍率ルーレット演出を追加。
- 3つ揃いの実確率は従来のまま維持しつつ、ハズレの一部を2リール同柄にしてリーチ演出を少し増加。
- 運試しの祭壇「階数」の成功報酬を +20〜50階 に変更。
