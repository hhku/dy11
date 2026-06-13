# MediaCrawler GUI Windows 绿色版

这是 MediaCrawler GUI 的 Windows 绿色版。用户解压后双击 `MediaCrawlerGUI.exe` 即可启动，不需要手动安装 Python，也不需要打开命令行。

## 使用方式

1. 解压 `MediaCrawlerPortable.zip`
2. 双击 `MediaCrawlerGUI.exe`
3. 浏览器会自动打开本地页面
4. 第一次运行按页面提示扫码登录
5. 开始采集
6. 需要表格时，手动点击导出或下载 Excel

## 重要说明

- 绿色版不包含作者本机的 Cookie、登录状态、账号信息、历史采集数据。
- `data/`、`browser_data/`、`.env` 不会被打进发布包。
- 第一次运行需要用户自己扫码登录。
- Excel 文件建议由用户在导出时自行选择或移动到自己的保存位置。
- 本项目仅供个人学习和研究爬虫技术使用，禁止用于任何商业用途或非法用途。

## Playwright 浏览器依赖

PyInstaller 可以打包 Python 依赖，但 Playwright 的 Chromium 浏览器体积较大，默认不完整打包进绿色版。

如果首次运行时提示缺少浏览器，请在 `MediaCrawlerPortable` 目录里双击：

```text
install_browser.bat
```

这个脚本会下载 Playwright Chromium 浏览器到当前绿色版目录下的 `ms-playwright` 文件夹。该步骤需要网络。

## 打包方式

开发者在项目根目录执行：

```text
build_portable.bat
```

输出文件：

```text
release/MediaCrawlerPortable.zip
```

生成目录：

```text
release/MediaCrawlerPortable/
```

主程序：

```text
release/MediaCrawlerPortable/MediaCrawlerGUI.exe
```

## 清理构建输出

项目规则禁止批量删除文件或目录，所以 `clean_release.bat` 不会执行递归删除。它只会把旧的发布目录和 zip 移动成带时间戳的名字，确认不需要后请手动删除。
