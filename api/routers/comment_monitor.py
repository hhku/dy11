from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from ..services.comment_monitor import comment_monitor


router = APIRouter(prefix="/comment-monitor", tags=["comment-monitor"])


class CommentMonitorStartRequest(BaseModel):
    video_url: str | None = None
    video_urls: list[str] | None = None
    interval_seconds: int = Field(default=60, ge=30, le=3600)
    max_comments_count: int = Field(default=200, ge=1, le=10000)
    enable_sub_comments: bool = False


@router.post("/start")
async def start_comment_monitor(request: CommentMonitorStartRequest):
    success = await comment_monitor.start(
        video_url=request.video_url or "",
        video_urls=request.video_urls,
        interval_seconds=request.interval_seconds,
        max_comments_count=request.max_comments_count,
        enable_sub_comments=request.enable_sub_comments,
    )
    if not success:
        if comment_monitor.is_running:
            raise HTTPException(status_code=400, detail="Comment monitor is already running")
        raise HTTPException(status_code=400, detail="Please provide at least one video URL")
    return {"status": "ok", "message": "Comment monitor started"}


@router.post("/stop")
async def stop_comment_monitor():
    success = await comment_monitor.stop()
    if not success:
        raise HTTPException(status_code=400, detail="Comment monitor is not running")
    return {"status": "ok", "message": "Comment monitor stopped"}


@router.get("/status")
async def get_comment_monitor_status():
    return comment_monitor.get_status()
