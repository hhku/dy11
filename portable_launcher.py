# -*- coding: utf-8 -*-
"""Portable Windows launcher for the MediaCrawler Web GUI."""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import threading
import time
import traceback
import webbrowser
from pathlib import Path


APP_NAME = "MediaCrawler GUI"
DEFAULT_PORT = 8080


def log_error(message: str) -> None:
    try:
        log_path = app_root() / "MediaCrawlerGUI.log"
        with log_path.open("a", encoding="utf-8") as f:
            f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {message}\n")
    except Exception:
        pass


def app_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parent


def configure_runtime() -> Path:
    root = app_root()
    os.chdir(root)
    os.environ.setdefault("PYTHONUTF8", "1")
    os.environ.setdefault("PYTHONUNBUFFERED", "1")
    os.environ.setdefault("MEDIACRAWLER_PORTABLE", "1")
    os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", str(root / "ms-playwright"))
    os.environ.setdefault("MEDIACRAWLER_RUNTIME_DIR", str(root))
    return root


def run_crawler_child() -> int:
    configure_runtime()
    sys.argv = [sys.argv[0], *sys.argv[2:]]
    from tools.app_runner import run
    from main import async_cleanup, main

    run(main, async_cleanup, cleanup_timeout_seconds=15.0)
    return 0


def install_browser() -> int:
    configure_runtime()
    from playwright.__main__ import main as playwright_main

    sys.argv = ["playwright", "install", "chromium"]
    return playwright_main()


def port_is_open(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.3)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def run_server(port: int) -> None:
    try:
        import uvicorn

        uvicorn.run(
            "api.main:app",
            host="127.0.0.1",
            port=port,
            log_level="warning",
            access_log=False,
            log_config=None,
        )
    except Exception:
        log_error("Server failed:\n" + traceback.format_exc())


def open_when_ready(port: int) -> None:
    url = f"http://127.0.0.1:{port}/"
    for _ in range(120):
        if port_is_open(port):
            webbrowser.open(url)
            return
        time.sleep(0.5)


def show_status_window(port: int) -> None:
    import tkinter as tk
    from tkinter import messagebox

    root = tk.Tk()
    root.title(APP_NAME)
    root.geometry("420x190")
    root.resizable(False, False)

    url = f"http://127.0.0.1:{port}/"
    label = tk.Label(root, text="MediaCrawler GUI 正在运行", font=("Microsoft YaHei UI", 13, "bold"))
    label.pack(pady=(22, 8))

    hint = tk.Label(
        root,
        text=f"浏览器会自动打开：\n{url}\n\n关闭这个窗口会退出本地 GUI 服务。",
        justify="center",
        font=("Microsoft YaHei UI", 9),
    )
    hint.pack()

    def reopen() -> None:
        webbrowser.open(url)

    def on_close() -> None:
        if messagebox.askokcancel("退出", "确定退出 MediaCrawler GUI 吗？"):
            root.destroy()
            os._exit(0)

    button = tk.Button(root, text="重新打开页面", command=reopen, width=18)
    button.pack(pady=12)
    root.protocol("WM_DELETE_WINDOW", on_close)
    root.mainloop()


def main() -> int:
    if "--crawler-child" in sys.argv:
        return run_crawler_child()
    if "--install-browser" in sys.argv:
        return install_browser()

    configure_runtime()
    port = int(os.environ.get("MEDIACRAWLER_PORT", DEFAULT_PORT))

    server_thread = threading.Thread(target=run_server, args=(port,), daemon=True)
    server_thread.start()

    opener_thread = threading.Thread(target=open_when_ready, args=(port,), daemon=True)
    opener_thread.start()

    show_status_window(port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
