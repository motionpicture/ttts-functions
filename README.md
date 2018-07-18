<img src="https://motionpicture.jp/images/common/logo_01.svg" alt="motionpicture" title="motionpicture" align="right" height="56" width="98"/>

# 東京タワードメインモデル for Node.js

[![CircleCI](https://circleci.com/gh/motionpicture/ttts-domain.svg?style=svg&circle-token=2659057577162e85a2d91f193282f94ac7780afc)](https://circleci.com/gh/motionpicture/ttts-domain)

node.jsで使用するための東京タワーオンラインチケットシステムのドメインモデルパッケージです。


## Table of contents

* [Usage](#usage)
* [License](#license)


## Usage

```shell
npm install

funcpack pack ./
cd .funcpack/
func azure functionapp publish **ttts-functions-develop**
```

### Environment variables

| Name                              | Required | Value         | Purpose                         |
| --------------------------------- | -------- | ------------- | ------------------------------- |
| `MONGOLAB_URI`                    | true     |               | MongoDBアドオン                   |
| `NODE_ENV`                        | true     |               | 環境変数                          |
| `AZURE_STORAGE_CONNECTION_STRING` | true     |               | ファイル保管用のazureストレージ接続文字列 |


## License

ISC
