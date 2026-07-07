# Unique Logic Edit

這個 Repository 用來保存 **Unique Logic 網站的 UI 修改**。

## 給 UI Designer（你）

### 你主要會改這些檔案

| 資料夾 | 用途 |
|--------|------|
| `content/_src/styles.css` | 全站主要樣式 |
| `content/_src/*.html` | 各頁面 HTML 模板 |
| `content/_src/asset/` | 圖片、SVG logo |
| `content/rerenderer.js` | 前端渲染邏輯 |
| `content/_src/_map/step4/pages/` | 各頁面文字內容（JSON） |

### 本機預覽

1. 確保 **Docker Desktop** 已開啟
2. 在瀏覽器打開：**http://localhost:8080**
3. 修改 `content/` 內的檔案後，重新整理瀏覽器即可看到效果

> 你不需要理解 Docker。只要 Docker Desktop 在運行，網站就會在 `localhost:8080` 顯示。

### 把修改儲存到 GitHub

在 Terminal 執行：

```bash
cd "/Users/ailo.t/Downloads/Unique Logic/20260624_uniquelogic_2fe2aa274f465ac27806_20260624034647_archive"
./scripts/save.sh "描述你改了什麼"
```

例子：

```bash
./scripts/save.sh "調整首頁 hero 區塊 padding"
```

## 給同事（Developer / 其他 Designer）

### 第一次設定

1. Clone 這個 repository
2. 確保已安裝 [Docker Desktop](https://www.docker.com/products/docker-desktop/)
3. 執行：

```bash
./scripts/setup-local.sh
```

4. 打開 **http://localhost:8080**

### 取得最新 UI 修改

```bash
git pull
```

然後重新整理瀏覽器。

## Repository 結構

```
content/                  ← UI 主要修改位置
wp-content/mu-plugins/    ← WordPress 與前端的連接
docker-compose.yml        ← 本機環境設定
data/initial-database.sql ← 網站資料庫快照
scripts/                  ← 儲存與設定腳本
```
