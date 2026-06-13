# -*- coding: utf-8 -*-
# Copyright (c) 2025 relakkes@gmail.com
#
# This file is part of MediaCrawler project.
# Repository: https://github.com/NanmiCoder/MediaCrawler/blob/main/api/routers/data.py
# GitHub: https://github.com/NanmiCoder
# Licensed under NON-COMMERCIAL LEARNING LICENSE 1.1
#
# 声明：本代码仅供学习和研究目的使用。使用者应遵守以下原则：
# 1. 不得用于任何商业用途。
# 2. 使用时应遵守目标平台的使用条款和robots.txt规则。
# 3. 不得进行大规模爬取或对平台造成运营干扰。
# 4. 应合理控制请求频率，避免给目标平台带来不必要的负担。
# 5. 不得用于任何非法或不当的用途。
#
# 详细许可条款请参阅项目根目录下的LICENSE文件。
# 使用本代码即表示您同意遵守上述原则和LICENSE中的所有条款。

import os
import json
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(prefix="/data", tags=["data"])

# Data directory
DATA_DIR = Path(__file__).parent.parent.parent / "data"
CHINA_TIMEZONE = timezone(timedelta(hours=8))


def is_comment_file(file_path: Path) -> bool:
    """Check whether this file is a comments export."""
    return "comments" in file_path.stem.lower()


def move_columns_first(columns: list, first_columns: list) -> list:
    """Return columns with selected names moved to the front."""
    return [col for col in first_columns if col in columns] + [
        col for col in columns if col not in first_columns
    ]


def reorder_rows(rows: list, columns: list) -> list:
    """Rebuild row dictionaries in the display column order."""
    return [{column: row.get(column) for column in columns} for row in rows]


def format_comment_time(value):
    """Convert crawler timestamp values to readable local time."""
    if value in (None, ""):
        return value

    try:
        timestamp = int(float(value))
    except (TypeError, ValueError):
        return value

    return datetime.fromtimestamp(timestamp, CHINA_TIMEZONE).strftime("%Y-%m-%d %H:%M:%S")


def comment_time_sort_value(row: dict) -> float:
    """Get a numeric timestamp for sorting comment preview rows."""
    try:
        return float(row.get("create_time") or 0)
    except (TypeError, ValueError):
        return 0


def sort_comment_rows(file_path: Path, rows: list) -> list:
    """Sort comment preview rows by publish time, newest first."""
    if not is_comment_file(file_path):
        return rows
    return sorted(rows, key=comment_time_sort_value, reverse=True)


def format_preview_rows(file_path: Path, rows: list) -> list:
    """Format preview-only values without changing saved data files."""
    if not is_comment_file(file_path):
        return rows

    for row in rows:
        if isinstance(row, dict) and "create_time" in row:
            row["create_time"] = format_comment_time(row["create_time"])
    return rows


def preview_columns(file_path: Path, columns: list) -> list:
    """Column order used by the WebUI preview."""
    if is_comment_file(file_path):
        return move_columns_first(columns, ["create_time"])
    return columns


def get_file_info(file_path: Path) -> dict:
    """Get file information"""
    stat = file_path.stat()
    record_count = None

    # Try to get record count
    try:
        if file_path.suffix == ".json":
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    record_count = len(data)
        elif file_path.suffix == ".csv":
            with open(file_path, "r", encoding="utf-8") as f:
                record_count = sum(1 for _ in f) - 1  # Subtract header row
    except Exception:
        pass

    return {
        "name": file_path.name,
        "path": str(file_path.relative_to(DATA_DIR)),
        "size": stat.st_size,
        "modified_at": stat.st_mtime,
        "record_count": record_count,
        "type": file_path.suffix[1:] if file_path.suffix else "unknown"
    }


@router.get("/files")
async def list_data_files(platform: Optional[str] = None, file_type: Optional[str] = None):
    """Get data file list"""
    if not DATA_DIR.exists():
        return {"files": []}

    files = []
    supported_extensions = {".json", ".csv", ".xlsx", ".xls"}

    for root, dirs, filenames in os.walk(DATA_DIR):
        root_path = Path(root)
        for filename in filenames:
            file_path = root_path / filename
            if file_path.suffix.lower() not in supported_extensions:
                continue

            # Platform filter
            if platform:
                rel_path = str(file_path.relative_to(DATA_DIR))
                if platform.lower() not in rel_path.lower():
                    continue

            # Type filter
            if file_type and file_path.suffix[1:].lower() != file_type.lower():
                continue

            try:
                files.append(get_file_info(file_path))
            except Exception:
                continue

    # Sort by modification time (newest first)
    files.sort(key=lambda x: x["modified_at"], reverse=True)

    return {"files": files}


@router.get("/files/{file_path:path}")
async def get_file_content(file_path: str, preview: bool = True, limit: int = 100):
    """Get file content or preview"""
    full_path = DATA_DIR / file_path

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    if not full_path.is_file():
        raise HTTPException(status_code=400, detail="Not a file")

    # Security check: ensure within DATA_DIR
    try:
        full_path.resolve().relative_to(DATA_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    if preview:
        # Return preview data
        try:
            if full_path.suffix == ".json":
                with open(full_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        rows = sort_comment_rows(full_path, data)[:limit]
                        rows = format_preview_rows(full_path, rows)
                        columns = list(rows[0].keys()) if rows and isinstance(rows[0], dict) else []
                        columns = preview_columns(full_path, columns)
                        if columns:
                            rows = reorder_rows(rows, columns)
                            return {"data": rows, "total": len(data), "columns": columns}
                        return {"data": rows, "total": len(data)}
                    return {"data": data, "total": 1}
            elif full_path.suffix == ".csv":
                import csv
                with open(full_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    rows = list(reader)
                    total = len(rows)
                    rows = sort_comment_rows(full_path, rows)[:limit]
                    rows = format_preview_rows(full_path, rows)
                    columns = preview_columns(full_path, reader.fieldnames or [])
                    if columns:
                        rows = reorder_rows(rows, columns)
                    return {"data": rows, "total": total, "columns": columns}
            elif full_path.suffix.lower() in (".xlsx", ".xls"):
                import pandas as pd
                df = pd.read_excel(full_path)
                columns = preview_columns(full_path, list(df.columns))
                total = len(df)
                if is_comment_file(full_path) and "create_time" in df.columns:
                    df = df.sort_values(by="create_time", ascending=False)
                df = df.head(limit)
                if is_comment_file(full_path) and "create_time" in df.columns:
                    df["create_time"] = df["create_time"].apply(format_comment_time)
                if columns:
                    df = df[columns]
                # Convert to list of dictionaries, handle NaN values
                rows = df.where(pd.notnull(df), None).to_dict(orient='records')
                return {
                    "data": rows,
                    "total": total,
                    "columns": columns
                }
            else:
                raise HTTPException(status_code=400, detail="Unsupported file type for preview")
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON file")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Return file download
        return FileResponse(
            path=full_path,
            filename=full_path.name,
            media_type="application/octet-stream"
        )


@router.get("/download/{file_path:path}")
async def download_file(file_path: str):
    """Download file"""
    full_path = DATA_DIR / file_path

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    if not full_path.is_file():
        raise HTTPException(status_code=400, detail="Not a file")

    # Security check
    try:
        full_path.resolve().relative_to(DATA_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    return FileResponse(
        path=full_path,
        filename=full_path.name,
        media_type="application/octet-stream"
    )


@router.delete("/files/{file_path:path}")
async def delete_data_file(file_path: str):
    """Delete one data file."""
    full_path = DATA_DIR / file_path

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    if not full_path.is_file():
        raise HTTPException(status_code=400, detail="Not a file")

    try:
        full_path.resolve().relative_to(DATA_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    full_path.unlink()
    return {"status": "ok", "message": "File deleted", "path": file_path}


@router.get("/stats")
async def get_data_stats():
    """Get data statistics"""
    if not DATA_DIR.exists():
        return {"total_files": 0, "total_size": 0, "by_platform": {}, "by_type": {}}

    stats = {
        "total_files": 0,
        "total_size": 0,
        "by_platform": {},
        "by_type": {}
    }

    supported_extensions = {".json", ".csv", ".xlsx", ".xls"}

    for root, dirs, filenames in os.walk(DATA_DIR):
        root_path = Path(root)
        for filename in filenames:
            file_path = root_path / filename
            if file_path.suffix.lower() not in supported_extensions:
                continue

            try:
                stat = file_path.stat()
                stats["total_files"] += 1
                stats["total_size"] += stat.st_size

                # Statistics by type
                file_type = file_path.suffix[1:].lower()
                stats["by_type"][file_type] = stats["by_type"].get(file_type, 0) + 1

                # Statistics by platform (inferred from path)
                rel_path = str(file_path.relative_to(DATA_DIR))
                for platform in ["xhs", "dy", "ks", "bili", "wb", "tieba", "zhihu"]:
                    if platform in rel_path.lower():
                        stats["by_platform"][platform] = stats["by_platform"].get(platform, 0) + 1
                        break
            except Exception:
                continue

    return stats
