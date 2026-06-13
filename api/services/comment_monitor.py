import asyncio
from datetime import datetime, timedelta
from typing import Optional

from ..schemas import (
    CrawlerStartRequest,
    CrawlerTypeEnum,
    LoginTypeEnum,
    PlatformEnum,
    SaveDataOptionEnum,
)
from .crawler_manager import crawler_manager


class CommentMonitor:
    """Periodically crawl comments for one or more Douyin videos."""

    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()
        self.video_url = ""
        self.video_urls: list[str] = []
        self.current_video_url = ""
        self.current_index = 0
        self.completed_rounds = 0
        self.interval_seconds = 60
        self.max_comments_count = 200
        self.enable_sub_comments = False
        self.started_at: Optional[datetime] = None
        self.last_run_at: Optional[datetime] = None
        self.next_run_at: Optional[datetime] = None
        self.last_error: Optional[str] = None
        self._owns_crawler_run = False

    @property
    def is_running(self) -> bool:
        return bool(self._task and not self._task.done())

    async def start(
        self,
        video_url: str = "",
        video_urls: Optional[list[str]] = None,
        interval_seconds: int = 60,
        max_comments_count: int = 200,
        enable_sub_comments: bool = False,
    ) -> bool:
        if self.is_running:
            return False

        urls = self._normalize_urls(video_urls if video_urls is not None else video_url)
        if not urls:
            return False

        self.video_urls = urls
        self.video_url = urls[0]
        self.current_video_url = ""
        self.current_index = 0
        self.completed_rounds = 0
        self.interval_seconds = max(30, interval_seconds)
        self.max_comments_count = max(1, max_comments_count)
        self.enable_sub_comments = enable_sub_comments
        self.started_at = datetime.now()
        self.last_run_at = None
        self.next_run_at = None
        self.last_error = None
        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(self._run_loop())
        return True

    async def stop(self) -> bool:
        if not self.is_running:
            return False

        self._stop_event.set()
        if self._owns_crawler_run and crawler_manager.process and crawler_manager.process.poll() is None:
            await crawler_manager.stop()

        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

        self.next_run_at = None
        self._owns_crawler_run = False
        return True

    def get_status(self) -> dict:
        return {
            "running": self.is_running,
            "video_url": self.video_url or None,
            "video_urls": self.video_urls,
            "current_video_url": self.current_video_url or None,
            "current_index": self.current_index,
            "total_videos": len(self.video_urls),
            "completed_rounds": self.completed_rounds,
            "interval_seconds": self.interval_seconds,
            "max_comments_count": self.max_comments_count,
            "enable_sub_comments": self.enable_sub_comments,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "last_run_at": self.last_run_at.isoformat() if self.last_run_at else None,
            "next_run_at": self.next_run_at.isoformat() if self.next_run_at else None,
            "last_error": self.last_error,
        }

    def _normalize_urls(self, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            raw_urls = value.splitlines()
        else:
            raw_urls = value

        urls: list[str] = []
        seen = set()
        for raw_url in raw_urls:
            url = raw_url.strip()
            if not url or url in seen:
                continue
            urls.append(url)
            seen.add(url)
        return urls

    async def _run_loop(self):
        while not self._stop_event.is_set():
            try:
                await self._crawl_round()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                self.last_error = f"{type(exc).__name__}: {exc}"

            self.next_run_at = datetime.now() + timedelta(seconds=self.interval_seconds)
            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=self.interval_seconds)
            except asyncio.TimeoutError:
                continue

    async def _crawl_round(self):
        for index, video_url in enumerate(self.video_urls, start=1):
            if self._stop_event.is_set():
                return
            self.current_index = index
            self.current_video_url = video_url
            await self._crawl_one(video_url)
        self.completed_rounds += 1
        self.current_index = 0
        self.current_video_url = ""

    async def _crawl_one(self, video_url: str):
        while crawler_manager.process and crawler_manager.process.poll() is None:
            if self._stop_event.is_set():
                return
            await asyncio.sleep(1)

        config = CrawlerStartRequest(
            platform=PlatformEnum.DOUYIN,
            login_type=LoginTypeEnum.QRCODE,
            crawler_type=CrawlerTypeEnum.DETAIL,
            specified_ids=video_url,
            enable_comments=True,
            enable_sub_comments=self.enable_sub_comments,
            save_option=SaveDataOptionEnum.JSON,
            headless=False,
            max_comments_count=self.max_comments_count,
        )

        self.last_run_at = datetime.now()
        self.last_error = None
        self._owns_crawler_run = await crawler_manager.start(config)
        if not self._owns_crawler_run:
            self.last_error = "Crawler is busy"
            return

        try:
            while crawler_manager.process and crawler_manager.process.poll() is None:
                if self._stop_event.is_set():
                    await crawler_manager.stop()
                    return
                await asyncio.sleep(1)
        finally:
            self._owns_crawler_run = False


comment_monitor = CommentMonitor()
