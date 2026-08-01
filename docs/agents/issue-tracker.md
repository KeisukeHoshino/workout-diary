# Issue tracker: GitHub

このリポジトリのIssueとPRDはGitHub Issuesで管理します。すべての操作には `gh` CLIを使用します。

## 運用規約

- **Issueを作成する**: `gh issue create --title "..." --body "..."` を実行します。複数行の本文にはヒアドキュメントを使用します。
- **Issueを読む**: `gh issue view <番号> --comments` を実行し、`jq` でコメントを絞り込むとともにラベルも取得します。
- **Issueを一覧取得する**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` を基準に、必要な `--label` と `--state` のフィルターを指定します。
- **Issueにコメントする**: `gh issue comment <番号> --body "..."` を実行します。
- **ラベルを付与または削除する**: `gh issue edit <番号> --add-label "..."` または `gh issue edit <番号> --remove-label "..."` を実行します。
- **Issueをクローズする**: `gh issue close <番号> --comment "..."` を実行します。

対象リポジトリは `git remote -v` から判断します。リポジトリのクローン内で実行すると、`gh` が自動的に判断します。

## Triage対象としてのPull Request

**依頼の受付先としてPull Requestを扱う: いいえ。** `/triage` で外部Pull Requestも扱う場合は、この値を「はい」に変更します。

「はい」の場合は、Issueと同じラベルおよび状態をPull Requestにも適用し、対応する `gh pr` コマンドを使用します。

- **Pull Requestを読む**: `gh pr view <番号> --comments` を実行し、差分には `gh pr diff <番号>` を使用します。
- **Triage対象の外部Pull Requestを一覧取得する**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` を実行し、`authorAssociation` が `CONTRIBUTOR`、`FIRST_TIME_CONTRIBUTOR`、`NONE` のものだけを残します。`OWNER`、`MEMBER`、`COLLABORATOR` は除外します。
- **コメント、ラベル操作、クローズ**: `gh pr comment`、`gh pr edit --add-label`、`gh pr edit --remove-label`、`gh pr close` を使用します。

GitHubではIssueとPull Requestが同じ番号空間を共有します。`#42` のように種別が不明な場合は `gh pr view 42` を試し、Pull Requestでなければ `gh issue view 42` を実行します。

## スキルからIssue trackerへ公開する場合

GitHub Issueを作成します。

## スキルが関連チケットを取得する場合

`gh issue view <番号> --comments` を実行します。

## Wayfinderの操作

`/wayfinder` では、1件のIssueを**マップ**として使用し、その子Issueをチケットとして扱います。

- **マップ**: `wayfinder:map` ラベルを付けた1件のIssueです。本文に「メモ」「これまでの決定」「不明点」を記載し、`gh issue create --label wayfinder:map` で作成します。
- **子チケット**: GitHubのsub-issue APIを `gh api` から使用し、マップの子Issueとして関連付けます。sub-issueが利用できない場合はマップ本文のタスクリストへ追加し、子Issue本文の先頭に `Part of #<マップ番号>` を記載します。`wayfinder:<種類>` ラベルを使用し、種類は `research`、`prototype`、`grilling`、`task` のいずれかとします。着手後は担当する開発者をアサインします。
- **ブロック関係**: GitHubのネイティブなIssue依存関係を、UIから確認できる正規の表現として使用します。`gh api --method POST repos/<所有者>/<リポジトリ>/issues/<子Issue番号>/dependencies/blocked_by -F issue_id=<ブロッカーのDB ID>` で追加します。`issue_id` にはIssue番号や `node_id` ではなく、`gh api repos/<所有者>/<リポジトリ>/issues/<番号> --jq .id` で得られる数値のDB IDを指定します。依存関係が利用できない場合は、子Issue本文の先頭に `Blocked by: #<番号>, #<番号>` と記載します。すべてのブロッカーがクローズされた時点で着手可能です。
- **次のチケットを探す**: マップに属する未完了の子Issueを一覧取得し、未完了のブロッカーまたは担当者が設定されたものを除外します。マップ上で最初に並ぶIssueを選びます。
- **着手する**: `gh issue edit <番号> --add-assignee @me` を実行します。これをセッション最初の書き込み操作とします。
- **解決する**: `gh issue comment <番号> --body "<回答>"` で結果を記録してから `gh issue close <番号>` でクローズし、マップの「これまでの決定」にコンテキストへの参照とリンクを追記します。
