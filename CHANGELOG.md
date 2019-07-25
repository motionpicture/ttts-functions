# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/).

## Unreleased
### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## v1.0.4 - 2019-07-25
### Changed
- checkin情報はSQLServer上のreservations_checkinsから取得（ストアドをBI側functionsからキック）するよう変更
  checkin情報に関するコードを削除
  
## v1.0.3 - 2019-06-28
### Changed
- reservations に peformance_day がなくなった暫定対応
　今後も可能性があるため、一旦_idで無理矢理参照

## v1.0.2 - 2018-12-12
### Changed
- [POS連携]timeoutエラーにも関わらず完了フォルダにファイルが移動する

## v1.0.1 - 2018-11-02
### Added
- TimeoutをSlackに送信のバグを対応。

## v0.0.0 - 2018-01-12
### Added
- merge_functionを追加。
- update_functionを追加。
