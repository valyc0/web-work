import os
import sys
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from fastapi import UploadFile, File
from pydantic import BaseModel
import aiofiles
import aiofiles.os
import mimetypes
import shutil
import time
from typing import Optional

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT_DIR = Path(os.environ.get("WEBWORK_ROOT", Path.cwd()))

if getattr(sys, "frozen", False):
    static_dir = Path(sys._MEIPASS) / "static"
else:
    static_dir = Path(__file__).parent / "static"

@app.get("/")
async def index():
    return FileResponse(static_dir / "index.html")

app.mount("/static", StaticFiles(directory=static_dir), name="static")

def safe_path(requested: str) -> Path:
    """Resolve path and ensure it's within ROOT_DIR."""
    resolved = (ROOT_DIR / requested).resolve()
    if not str(resolved).startswith(str(ROOT_DIR.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")
    return resolved

@app.get("/api/tree")
async def get_tree(path: Optional[str] = ""):
    base = safe_path(path)
    if not base.is_dir():
        raise HTTPException(status_code=400, detail="Not a directory")

    def build_tree(directory: Path, depth: int = 0) -> list:
        if depth > 5:
            return []
        items = []
        try:
            entries = sorted(directory.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower()))
        except PermissionError:
            return []
        for entry in entries:
            if entry.name.startswith(".") and entry.name != ".gitignore":
                continue
            item = {
                "name": entry.name,
                "path": str(entry.relative_to(ROOT_DIR)),
                "type": "directory" if entry.is_dir() else "file",
            }
            if entry.is_dir():
                item["children"] = build_tree(entry, depth + 1)
            items.append(item)
        return items

    return build_tree(base)

@app.get("/api/files")
async def list_files(path: Optional[str] = ""):
    base = safe_path(path)
    if not base.is_dir():
        raise HTTPException(status_code=400, detail="Not a directory")

    items = []
    try:
        for entry in sorted(base.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower())):
            stat = entry.stat()
            items.append({
                "name": entry.name,
                "path": str(entry.relative_to(ROOT_DIR)),
                "type": "directory" if entry.is_dir() else "file",
                "size": stat.st_size if entry.is_file() else None,
                "mtime": stat.st_mtime,
            })
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")

    return items

@app.get("/api/file")
async def read_file(path: str = Query(...)):
    target = safe_path(path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    try:
        async with aiofiles.open(target, "r", errors="replace") as f:
            content = await f.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    mime, _ = mimetypes.guess_type(target.name)
    return {
        "content": content,
        "path": str(target.relative_to(ROOT_DIR)),
        "name": target.name,
        "mime": mime,
    }

class FileWrite(BaseModel):
    content: str

@app.put("/api/file")
async def write_file(path: str = Query(...), body: FileWrite = ...):
    target = safe_path(path)
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        async with aiofiles.open(target, "w") as f:
            await f.write(body.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"ok": True, "path": str(target.relative_to(ROOT_DIR))}

@app.delete("/api/file")
async def delete_file(path: str = Query(...)):
    target = safe_path(path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="Not found")

    try:
        if target.is_dir():
            await aiofiles.os.rmdir(target) if not any(target.iterdir()) else shutil.rmtree(target)
        else:
            await aiofiles.os.remove(target)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"ok": True}

@app.post("/api/mkdir")
async def create_directory(path: str = Query(...)):
    target = safe_path(path)
    try:
        target.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"ok": True, "path": str(target.relative_to(ROOT_DIR))}

class RenameRequest(BaseModel):
    old_path: str
    new_path: str

@app.post("/api/rename")
async def rename_file(body: RenameRequest):
    src = safe_path(body.old_path)
    dst = safe_path(body.new_path)
    if not src.exists():
        raise HTTPException(status_code=404, detail="Source not found")
    if dst.exists():
        raise HTTPException(status_code=409, detail="Destination already exists")

    try:
        src.rename(dst)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"ok": True}

@app.post("/api/upload")
async def upload_file(path: str = Query(""), file: UploadFile = File(...)):
    dest_dir = safe_path(path) if path else safe_path(".")
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / file.filename

    try:
        async with aiofiles.open(dest, "wb") as f:
            while chunk := await file.read(65536):
                await f.write(chunk)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"ok": True, "path": str(dest.relative_to(ROOT_DIR))}

@app.get("/api/download")
async def download_file(path: str = Query(...)):
    target = safe_path(path)
    if not target.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    async def file_stream():
        async with aiofiles.open(target, "rb") as f:
            while chunk := await f.read(65536):
                yield chunk

    return StreamingResponse(
        file_stream(),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{target.name}"'},
    )

import asyncio
import pty
import fcntl
import struct
import subprocess
from fastapi import WebSocket, WebSocketDisconnect

TIOCSWINSZ = 0x5414

@app.websocket("/ws/terminal")
async def terminal_ws(websocket: WebSocket):
    await websocket.accept()

    shell = os.environ.get("SHELL", "/bin/bash")
    master_fd, slave_fd = pty.openpty()

    env = os.environ.copy()
    env["TERM"] = "xterm-256color"

    proc = subprocess.Popen(
        [shell],
        cwd=str(ROOT_DIR),
        env=env,
        stdin=slave_fd,
        stdout=slave_fd,
        stderr=slave_fd,
        start_new_session=True,
    )
    os.close(slave_fd)

    flags = fcntl.fcntl(master_fd, fcntl.F_GETFL)
    fcntl.fcntl(master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

    async def read_pty():
        loop = asyncio.get_event_loop()
        while proc.poll() is None:
            try:
                data = await loop.run_in_executor(None, lambda: os.read(master_fd, 4096))
                if data:
                    await websocket.send_bytes(data)
            except (OSError, IOError):
                await asyncio.sleep(0.01)

    async def read_ws():
        while proc.poll() is None:
            try:
                msg = await websocket.receive_json()
                if "data" in msg:
                    os.write(master_fd, msg["data"].encode())
                elif "resize" in msg:
                    winsize = struct.pack("HHHH", msg["rows"], msg["cols"], 0, 0)
                    fcntl.ioctl(master_fd, TIOCSWINSZ, winsize)
            except WebSocketDisconnect:
                break
            except Exception:
                break

    read_task = asyncio.create_task(read_pty())
    write_task = asyncio.create_task(read_ws())

    try:
        await asyncio.gather(read_task, write_task)
    finally:
        read_task.cancel()
        write_task.cancel()
        os.close(master_fd)
        proc.kill()
        proc.wait()

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("WEBWORK_PORT", 8080))
    root = ROOT_DIR
    print(f"""
╔══════════════════════════════════════════╗
║              W E B W O R K              ║
╠══════════════════════════════════════════╣
║                                          ║
║  http://localhost:{port:<24}║
║  Root: {str(root)[:33]:<34}║
║                                          ║
║  Imposta root con WEBWORK_ROOT           ║
║  Es: WEBWORK_ROOT=/home/user ./webwork   ║
║                                          ║
║  Usage (source):                         ║
║    ./start.sh                            ║
║    ./start.sh /path/to/project           ║
║    ./start.sh /path 3000                 ║
║                                          ║
║  Usage (standalone):                     ║
║    ./webwork                             ║
║    WEBWORK_ROOT=/path ./webwork          ║
║    WEBWORK_ROOT=/path WEBWORK_PORT=3000  ║
║                                          ║
║  Ctrl+C to stop                          ║
╚══════════════════════════════════════════╝
""")
    uvicorn.run(app, host="0.0.0.0", port=port)
