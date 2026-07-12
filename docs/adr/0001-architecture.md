# ADR 0001: モジュラーモノリスとLocal-firstを採用する

- Status: Accepted
- Date: 2026-07-12

機能別モジュラーモノリス、軽量なClean Architecture、IndexedDBを一次保存先とするLocal-firstを採用する。UIはApplication Use Caseを通じてデータを操作し、Infrastructureへ直接依存しない。現段階ではマイクロサービス、Event Sourcing、全面的CQRSを採用しない。

クラウド同期は認証・競合・削除・バックアップの仕様が決定してから追加する。Repository Portを維持し、ローカル更新とOutboxを同じトランザクションへ含められる設計とする。
