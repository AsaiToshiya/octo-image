日本語 | [English](./README-en.md)
  
# octo-image

octo-image は、GitHub の様々な画像を取得するコマンド ライン ツールです。

動作には Google Chrome が必要です。


## インストール

```bash
npm i -g octo-image
```


## 使い方

### コントリビューション グラフ

```bash
octo-image contribution-graph <user>
```

![contribution-graph.png](contribution-graph.png)

### インボルブ

```bash
octo-image involves [--absolute-time] [--exclude-user <user>] <user>
```

[involves.png](involves.png)

### オープン グラフ

```bash
octo-image open-graph <user> <repo>
```

![open-graph.png](open-graph.png)


## ライセンス

    MIT License
    
    Copyright (c) 2022 Asai Toshiya
    
    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:
    
    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.
    
    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.