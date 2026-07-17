# Web Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal web-based code editor with file browser, multi-tab syntax-highlighted editor, and webshell terminal.

**Architecture:** Single-page app: FastAPI backend serves static files + REST API + WebSocket terminal. Frontend uses vanilla HTML/JS/CSS with CodeMirror 6 and xterm.js loaded via CDN (esm.sh).

**Tech Stack:** Python 3.10+, FastAPI, uvicorn, aiofiles, python-multipart, CodeMirror 6 (CDN), xterm.js (CDN)

## Global Constraints

- Python 3.10+ (match/case, type hints)
- Single user, no auth
- Path traversal protection: all file paths validated against configurable root (default `$HOME`)
- Dark theme, vanilla CSS (no framework)
- CDN imports via esm.sh for CodeMirror 6 and xterm.js

---

## File Structure

```
web-work/
├── main.py                 # FastAPI app: REST routes + WebSocket terminal
├── requirements.txt        # fastapi, uvicorn[standard], aiofiles, python-multipart
├── static/
│   ├── index.html          # SPA shell with 3-panel layout
│   ├── app.js              # Frontend logic (file browser, editor, terminal)
│   └── style.css           # Dark theme, grid layout
└── docs/
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `requirements.txt`
- Create: `main.py`
- Create: `static/index.html`
- Create: `static/style.css`
- Create: `static/app.js`

**Interfaces:**
- Produces: FastAPI app instance `app` in `main.py`
- Produces: `GET /` serves `static/index.html`
- Produces: `GET /static/{path}` serves static files

- [ ] **Step 1: Create requirements.txt**

```
fastapi
uvicorn[standard]
aiofiles
python-multipart
```

- [ ] **Step 2: Create minimal main.py**

```python
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

ROOT_DIR = Path(os.environ.get("WEBWORK_ROOT", Path.home()))

static_dir = Path(__file__).parent / "static"

@app.get("/")
async def index():
    return FileResponse(static_dir / "index.html")

app.mount("/static", StaticFiles(directory=static_dir), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
```

- [ ] **Step 3: Create minimal index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebWork</title>
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
    <div id="app">
        <div id="sidebar">
            <div id="sidebar-header">
                <span>Files</span>
                <button id="btn-new-folder" title="New Folder">+</button>
            </div>
            <div id="file-tree"></div>
        </div>
        <div id="main">
            <div id="editor-tabs"></div>
            <div id="editor-container"></div>
        </div>
        <div id="terminal-panel">
            <div id="terminal-header">
                <span>Terminal</span>
                <button id="btn-terminal-clear" title="Clear">x</button>
            </div>
            <div id="terminal"></div>
        </div>
    </div>
    <script type="module" src="/static/app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create minimal style.css**

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --bg-primary: #1e1e1e;
    --bg-secondary: #252526;
    --bg-tertiary: #2d2d2d;
    --bg-hover: #3e3e3e;
    --bg-active: #094771;
    --text-primary: #cccccc;
    --text-secondary: #858585;
    --border: #3e3e3e;
    --accent: #007acc;
    --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
    --sidebar-width: 250px;
    --terminal-height: 200px;
}

body {
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 13px;
    height: 100vh;
    overflow: hidden;
}

#app {
    display: grid;
    grid-template-columns: var(--sidebar-width) 1fr;
    grid-template-rows: 1fr var(--terminal-height);
    height: 100vh;
}

#sidebar {
    grid-row: 1 / 3;
    background: var(--bg-secondary);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

#sidebar-header {
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
    font-weight: bold;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 1px;
    color: var(--text-secondary);
}

#file-tree {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
}

#main {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

#editor-tabs {
    display: flex;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border);
    min-height: 35px;
    overflow-x: auto;
}

#editor-container {
    flex: 1;
    overflow: hidden;
}

#terminal-panel {
    grid-column: 2;
    background: var(--bg-primary);
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
}

#terminal-header {
    padding: 4px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-secondary);
}

#terminal {
    flex: 1;
    overflow: hidden;
}

button {
    background: none;
    border: 1px solid var(--border);
    color: var(--text-primary);
    cursor: pointer;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 12px;
}

button:hover {
    background: var(--bg-hover);
}

::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: var(--bg-primary);
}

::-webkit-scrollbar-thumb {
    background: var(--bg-hover);
    border-radius: 4px;
}
```

- [ ] **Step 5: Create empty app.js**

```javascript
// WebWork - Frontend Logic
console.log("WebWork loaded");
```

- [ ] **Step 6: Test scaffolding**

Run: `cd /home/valerio/lavoro/appo/web-work && pip install -r requirements.txt && python main.py &`
Open: `http://localhost:8080`
Expected: Dark page with 3-panel layout visible, "WebWork loaded" in console.
Kill server after test: `kill %1`

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: project scaffolding with FastAPI + 3-panel layout"
```

---

### Task 2: Backend — File Browser API

**Files:**
- Modify: `main.py` (add file browser routes)

**Interfaces:**
- Consumes: `ROOT_DIR` from Task 1
- Produces: `GET /api/tree?path=` returns directory tree JSON
- Produces: `GET /api/files?path=` returns directory listing JSON

- [ ] **Step 1: Add helper to validate and resolve paths**

Add to `main.py`:

```python
from fastapi import HTTPException, Query
import aiofiles
import aiofiles.os

def safe_path(requested: str) -> Path:
    """Resolve path and ensure it's within ROOT_DIR."""
    resolved = (ROOT_DIR / requested).resolve()
    if not str(resolved).startswith(str(ROOT_DIR.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")
    return resolved
```

- [ ] **Step 2: Add tree endpoint**

Add to `main.py`:

```python
from typing import Optional

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
```

- [ ] **Step 3: Add file listing endpoint**

Add to `main.py`:

```python
import time

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
```

- [ ] **Step 4: Test endpoints**

Run: `python main.py &`
Test tree: `curl -s http://localhost:8080/api/tree | python -m json.tool | head -30`
Test files: `curl -s http://localhost:8080/api/files | python -m json.tool | head -20`
Expected: JSON with directory contents from `$HOME`.
Kill server: `kill %1`

- [ ] **Step 5: Commit**

```bash
git add main.py
git commit -m "feat: backend file browser API (tree + listing)"
```

---

### Task 3: Backend — File Read/Write API

**Files:**
- Modify: `main.py` (add file CRUD routes)

**Interfaces:**
- Consumes: `safe_path()` from Task 2
- Produces: `GET /api/file?path=` returns file content
- Produces: `PUT /api/file?path=` creates/updates file
- Produces: `DELETE /api/file?path=` deletes file/directory
- Produces: `POST /api/mkdir?path=` creates directory
- Produces: `POST /api/rename` renames file/directory

- [ ] **Step 1: Add file read endpoint**

Add to `main.py`:

```python
import mimetypes

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
```

- [ ] **Step 2: Add file write endpoint**

Add to `main.py`:

```python
from pydantic import BaseModel

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
```

- [ ] **Step 3: Add delete endpoint**

Add to `main.py`:

```python
import shutil

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
```

- [ ] **Step 4: Add mkdir endpoint**

Add to `main.py`:

```python
@app.post("/api/mkdir")
async def create_directory(path: str = Query(...)):
    target = safe_path(path)
    try:
        target.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"ok": True, "path": str(target.relative_to(ROOT_DIR))}
```

- [ ] **Step 5: Add rename endpoint**

Add to `main.py`:

```python
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
```

- [ ] **Step 6: Test CRUD endpoints**

Run: `python main.py &`
Test read: `curl -s http://localhost:8080/api/file?path=requirements.txt`
Test write: `curl -s -X PUT http://localhost:8080/api/file?path=/tmp/test-webwork.txt -H 'Content-Type: application/json' -d '{"content":"hello"}'`
Test read back: `curl -s http://localhost:8080/api/file?path=/tmp/test-webwork.txt`
Test mkdir: `curl -s -X POST http://localhost:8080/api/mkdir?path=/tmp/test-webwork-dir`
Test delete: `curl -s -X DELETE http://localhost:8080/api/file?path=/tmp/test-webwork.txt`
Kill server: `kill %1`

- [ ] **Step 7: Commit**

```bash
git add main.py
git commit -m "feat: backend file CRUD API (read, write, delete, mkdir, rename)"
```

---

### Task 4: Backend — Upload/Download

**Files:**
- Modify: `main.py` (add upload/download routes)

**Interfaces:**
- Consumes: `safe_path()` from Task 2
- Produces: `POST /api/upload?path=` accepts multipart file upload
- Produces: `GET /api/download?path=` streams file download

- [ ] **Step 1: Add upload endpoint**

Add to `main.py`:

```python
from fastapi import UploadFile, File

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
```

- [ ] **Step 2: Add download endpoint**

Add to `main.py`:

```python
from fastapi.responses import StreamingResponse

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
```

- [ ] **Step 3: Test upload/download**

Run: `python main.py &`
Upload: `curl -s -X POST http://localhost:8080/api/upload -F "file=@requirements.txt"`
Download: `curl -s -o /tmp/downloaded.txt http://localhost:8080/api/download?path=requirements.txt && cat /tmp/downloaded.txt`
Expected: uploaded file appears, downloaded file matches original.
Kill server: `kill %1`

- [ ] **Step 4: Commit**

```bash
git add main.py
git commit -m "feat: backend upload/download API"
```

---

### Task 5: Backend — WebSocket Terminal

**Files:**
- Modify: `main.py` (add WebSocket terminal)

**Interfaces:**
- Consumes: `ROOT_DIR` from Task 1
- Produces: WebSocket endpoint at `/ws/terminal`

- [ ] **Step 1: Add terminal WebSocket endpoint**

Add to `main.py`:

```python
import asyncio
import pty
import fcntl
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws/terminal")
async def terminal_ws(websocket: WebSocket):
    await websocket.accept()

    # Spawn PTY with user's shell
    shell = os.environ.get("SHELL", "/bin/bash")
    pid, fd = pty.openpty()

    # Set working directory to ROOT_DIR
    env = os.environ.copy()
    env["TERM"] = "xterm-256color"

    child_pid = os.fork()
    if child_pid == 0:
        os.chdir(str(ROOT_DIR))
        os.execvpe(shell, [shell], env)
    else:
        os.close(pid)  # Close slave side in parent

        # Set non-blocking
        flags = fcntl.fcntl(fd, fcntl.F_GETFL)
        fcntl.fcntl(fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)

        loop = asyncio.get_event_loop()

        async def read_pty():
            while True:
                try:
                    data = os.read(fd, 4096)
                    if data:
                        await websocket.send_bytes(data)
                except (OSError, IOError):
                    await asyncio.sleep(0.01)

        async def read_ws():
            while True:
                try:
                    msg = await websocket.receive_json()
                    if "data" in msg:
                        os.write(fd, msg["data"].encode())
                    elif "resize" in msg:
                        import struct
                        winsize = struct.pack("HHHH", msg["rows"], msg["cols"], 0, 0)
                        fcntl.ioctl(fd, struct.unpack("HHHH", b'\x00' * 4)[0] if hasattr(struct, 'TIOCSWINSZ') else 0x5414, winsize)
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
            os.close(fd)
            os.kill(child_pid, 9)
            os.waitpid(child_pid, 0)
```

- [ ] **Step 2: Fix the resize handling (TIOCSWINSZ)**

Replace the resize block in `read_ws` with:

```python
import struct
TIOCSWINSZ = 0x5414
winsize = struct.pack("HHHH", msg["rows"], msg["cols"], 0, 0)
fcntl.ioctl(fd, TIOCSWINSZ, winsize)
```

- [ ] **Step 3: Test terminal**

Run: `python main.py &`
Open browser: `http://localhost:8080`
Expected: Terminal panel at bottom. Type `ls` → output appears. Type `echo hello` → output appears.
Kill server: `kill %1`

- [ ] **Step 4: Commit**

```bash
git add main.py
git commit -m "feat: backend WebSocket terminal (PTY)"
```

---

### Task 6: Frontend — File Browser

**Files:**
- Modify: `static/app.js` (add file browser module)
- Modify: `static/style.css` (add file browser styles)

**Interfaces:**
- Consumes: `GET /api/tree` from Task 2
- Consumes: `GET /api/files` from Task 2
- Produces: `openFile(path)` function (called by editor module)

- [ ] **Step 1: Add file browser CSS**

Add to `style.css`:

```css
.tree-item {
    display: flex;
    align-items: center;
    padding: 3px 8px 3px calc(8px + var(--depth, 0) * 16px);
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
}

.tree-item:hover {
    background: var(--bg-hover);
}

.tree-item.active {
    background: var(--bg-active);
}

.tree-item .icon {
    margin-right: 6px;
    font-size: 12px;
    width: 16px;
    text-align: center;
    flex-shrink: 0;
}

.tree-item .name {
    overflow: hidden;
    text-overflow: ellipsis;
}

.tree-item .arrow {
    margin-right: 4px;
    font-size: 10px;
    width: 12px;
    text-align: center;
    transition: transform 0.1s;
}

.tree-item .arrow.open {
    transform: rotate(90deg);
}

.tree-item.dir .arrow::before {
    content: "▶";
}

.tree-item.file .arrow {
    visibility: hidden;
}

.context-menu {
    position: fixed;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 4px 0;
    z-index: 1000;
    min-width: 160px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.context-menu-item {
    padding: 6px 16px;
    cursor: pointer;
    font-size: 12px;
}

.context-menu-item:hover {
    background: var(--bg-hover);
}

.context-menu-separator {
    border-top: 1px solid var(--border);
    margin: 4px 0;
}
```

- [ ] **Step 2: Add file browser module to app.js**

Replace `static/app.js` with:

```javascript
// WebWork - Frontend Logic

// === FILE BROWSER ===
class FileBrowser {
    constructor(containerEl, onFileOpen) {
        this.container = containerEl;
        this.onFileOpen = onFileOpen;
        this.activePath = null;
        this.contextMenu = null;
        this.loadTree();
    }

    async loadTree() {
        try {
            const res = await fetch("/api/tree");
            const tree = await res.json();
            this.container.innerHTML = "";
            this.renderTree(tree, this.container, 0);
        } catch (e) {
            console.error("Failed to load tree:", e);
        }
    }

    renderTree(items, parent, depth) {
        for (const item of items) {
            const el = document.createElement("div");
            el.className = `tree-item ${item.type}`;
            el.style.setProperty("--depth", depth);

            const arrow = document.createElement("span");
            arrow.className = "arrow";
            el.appendChild(arrow);

            const icon = document.createElement("span");
            icon.className = "icon";
            icon.textContent = item.type === "directory" ? "📁" : this.getFileIcon(item.name);
            el.appendChild(icon);

            const name = document.createElement("span");
            name.className = "name";
            name.textContent = item.name;
            el.appendChild(name);

            el.addEventListener("click", (e) => {
                e.stopPropagation();
                if (item.type === "directory") {
                    this.toggleDir(el, item, depth);
                } else {
                    this.onFileOpen(item.path);
                    this.setActive(el);
                }
            });

            el.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showContextMenu(e, item);
            });

            parent.appendChild(el);
        }
    }

    getFileIcon(name) {
        const ext = name.split(".").pop().toLowerCase();
        const icons = {
            py: "🐍", js: "📜", ts: "📜", html: "🌐", css: "🎨",
            json: "📋", yaml: "📋", yml: "📋", md: "📝", txt: "📄",
            sh: "⚙️", bash: "⚙️", zsh: "⚙️",
        };
        return icons[ext] || "📄";
    }

    toggleDir(el, item, depth) {
        const existing = el.nextElementSibling;
        if (existing && existing.classList.contains("tree-children")) {
            existing.remove();
            el.querySelector(".arrow").classList.remove("open");
        } else {
            const container = document.createElement("div");
            container.className = "tree-children";
            el.parentNode.insertBefore(container, el.nextSibling);
            el.querySelector(".arrow").classList.add("open");
            this.loadSubDir(item.path, container, depth + 1);
        }
    }

    async loadSubDir(path, container, depth) {
        try {
            const res = await fetch(`/api/tree?path=${encodeURIComponent(path)}`);
            const tree = await res.json();
            this.renderTree(tree, container, depth);
        } catch (e) {
            console.error("Failed to load subdirectory:", e);
        }
    }

    setActive(el) {
        this.container.querySelectorAll(".tree-item.active").forEach(e => e.classList.remove("active"));
        el.classList.add("active");
    }

    showContextMenu(e, item) {
        this.hideContextMenu();
        const menu = document.createElement("div");
        menu.className = "context-menu";

        const actions = [
            { label: "New File", action: () => this.newFile(item) },
            { label: "New Folder", action: () => this.newFolder(item) },
            { type: "separator" },
            { label: "Rename", action: () => this.renameItem(item) },
            { label: "Delete", action: () => this.deleteItem(item) },
            { type: "separator" },
            { label: "Download", action: () => this.downloadItem(item) },
        ];

        for (const action of actions) {
            if (action.type === "separator") {
                const sep = document.createElement("div");
                sep.className = "context-menu-separator";
                menu.appendChild(sep);
            } else {
                const btn = document.createElement("div");
                btn.className = "context-menu-item";
                btn.textContent = action.label;
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.hideContextMenu();
                    action.action();
                });
                menu.appendChild(btn);
            }
        }

        menu.style.left = e.clientX + "px";
        menu.style.top = e.clientY + "px";
        document.body.appendChild(menu);
        this.contextMenu = menu;

        const hide = () => {
            this.hideContextMenu();
            document.removeEventListener("click", hide);
        };
        setTimeout(() => document.addEventListener("click", hide), 0);
    }

    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.remove();
            this.contextMenu = null;
        }
    }

    async newFile(parentItem) {
        const name = prompt("File name:");
        if (!name) return;
        const parentPath = parentItem.type === "directory" ? parentItem.path : parentItem.path.split("/").slice(0, -1).join("/");
        const filePath = parentPath ? `${parentPath}/${name}` : name;
        try {
            await fetch(`/api/file?path=${encodeURIComponent(filePath)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: "" }),
            });
            this.loadTree();
        } catch (e) {
            alert("Failed to create file: " + e.message);
        }
    }

    async newFolder(parentItem) {
        const name = prompt("Folder name:");
        if (!name) return;
        const parentPath = parentItem.type === "directory" ? parentItem.path : parentItem.path.split("/").slice(0, -1).join("/");
        const folderPath = parentPath ? `${parentPath}/${name}` : name;
        try {
            await fetch(`/api/mkdir?path=${encodeURIComponent(folderPath)}`, { method: "POST" });
            this.loadTree();
        } catch (e) {
            alert("Failed to create folder: " + e.message);
        }
    }

    async renameItem(item) {
        const newName = prompt("New name:", item.name);
        if (!newName || newName === item.name) return;
        const parentPath = item.path.split("/").slice(0, -1).join("/");
        const newPath = parentPath ? `${parentPath}/${newName}` : newName;
        try {
            await fetch("/api/rename", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ old_path: item.path, new_path: newPath }),
            });
            this.loadTree();
        } catch (e) {
            alert("Failed to rename: " + e.message);
        }
    }

    async deleteItem(item) {
        if (!confirm(`Delete "${item.name}"?`)) return;
        try {
            await fetch(`/api/file?path=${encodeURIComponent(item.path)}`, { method: "DELETE" });
            this.loadTree();
        } catch (e) {
            alert("Failed to delete: " + e.message);
        }
    }

    downloadItem(item) {
        window.open(`/api/download?path=${encodeURIComponent(item.path)}`, "_blank");
    }
}
```

- [ ] **Step 3: Add drag-drop upload zone**

Add to `FileBrowser` class in `app.js`:

```javascript
    setupDropZone() {
        const tree = this.container;
        tree.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            tree.style.background = "var(--bg-active)";
        });

        tree.addEventListener("dragleave", () => {
            tree.style.background = "";
        });

        tree.addEventListener("drop", async (e) => {
            e.preventDefault();
            tree.style.background = "";

            const files = e.dataTransfer.files;
            for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);
                try {
                    await fetch("/api/upload", { method: "POST", body: formData });
                } catch (err) {
                    alert("Upload failed: " + err.message);
                }
            }
            this.loadTree();
        });
    }
```

Call `this.setupDropZone()` at the end of the `constructor`.

- [ ] **Step 4: Test file browser**

Run: `python main.py &`
Open: `http://localhost:8080`
Expected: Left sidebar shows file tree from `$HOME`. Click folder → expands. Click file → (nothing yet, editor not connected). Right-click → context menu. Drag file → uploads.
Kill server: `kill %1`

- [ ] **Step 5: Commit**

```bash
git add static/app.js static/style.css
git commit -m "feat: frontend file browser with tree view, context menu, drag-drop"
```

---

### Task 7: Frontend — CodeMirror 6 Editor

**Files:**
- Modify: `static/app.js` (add editor module)
- Modify: `static/index.html` (add CodeMirror CSS import)

**Interfaces:**
- Consumes: `GET /api/file` from Task 3
- Consumes: `PUT /api/file` from Task 3
- Produces: `openFile(path)` callable by file browser

- [ ] **Step 1: Add CodeMirror 6 CDN import to index.html**

Add to `<head>` in `index.html`:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/codemirror@6.65.7/lib/codemirror.min.css">
```

Wait — CodeMirror 6 uses ES modules, not global CSS. Let me use a different approach. Add to `app.js` top instead:

```javascript
// CodeMirror 6 will be loaded via dynamic import from esm.sh
```

- [ ] **Step 2: Add editor module to app.js**

Add after the `FileBrowser` class in `app.js`:

```javascript
// === EDITOR ===
class Editor {
    constructor(containerEl, tabsEl) {
        this.container = containerEl;
        this.tabsEl = tabsEl;
        this.tabs = new Map(); // path -> { view, tabEl, content, modified }
        this.activeTab = null;
        this.cmModules = null;
        this.setupKeyBindings();
    }

    async loadModules() {
        if (this.cmModules) return this.cmModules;
        const [
            { EditorView, basicSetup },
            { javascript },
            { python },
            { json },
            { html },
            { css },
            { yaml },
        ] = await Promise.all([
            import("https://esm.sh/@codemirror/basic-setup@6"),
            import("https://esm.sh/@codemirror/lang-javascript@6"),
            import("https://esm.sh/@codemirror/lang-python@6"),
            import("https://esm.sh/@codemirror/lang-json@6"),
            import("https://esm.sh/@codemirror/lang-html@6"),
            import("https://esm.sh/@codemirror/lang-css@6"),
            import("https://esm.sh/@codemirror/lang-yaml@6"),
        ]);
        this.cmModules = { EditorView, basicSetup, javascript, python, json, html, css, yaml };
        return this.cmModules;
    }

    getLanguage(filename) {
        const ext = filename.split(".").pop().toLowerCase();
        const map = {
            js: "javascript", jsx: "javascript", mjs: "javascript", ts: "javascript", tsx: "javascript",
            py: "python", pyw: "python",
            json: "json",
            html: "html", htm: "html",
            css: "css", scss: "css",
            yaml: "yaml", yml: "yaml",
        };
        return map[ext] || null;
    }

    async openFile(path, content) {
        if (this.tabs.has(path)) {
            this.activateTab(path);
            return;
        }

        const mods = await this.loadModules();
        const { EditorView, basicSetup, ...langs } = mods;

        const filename = path.split("/").pop();
        const langName = this.getLanguage(filename);
        const langExtension = langName && langs[langName] ? langs[langName]() : [];

        const updateListener = EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                const tab = this.tabs.get(path);
                if (tab && !tab.modified) {
                    tab.modified = true;
                    tab.tabEl.classList.add("modified");
                }
            }
        });

        const view = new EditorView({
            doc: content,
            extensions: [basicSetup, langExtension, updateListener, EditorView.theme({
                "&": { height: "100%" },
                ".cm-scroller": { overflow: "auto" },
            })],
            parent: this.container,
        });

        const tabEl = this.createTabEl(path, filename);

        this.tabs.set(path, { view, tabEl, modified: false });
        this.tabsEl.appendChild(tabEl);
        this.activateTab(path);
    }

    createTabEl(path, filename) {
        const tab = document.createElement("div");
        tab.className = "editor-tab";
        tab.dataset.path = path;

        const nameSpan = document.createElement("span");
        nameSpan.className = "tab-name";
        nameSpan.textContent = filename;
        tab.appendChild(nameSpan);

        const closeBtn = document.createElement("span");
        closeBtn.className = "tab-close";
        closeBtn.textContent = "×";
        closeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.closeTab(path);
        });
        tab.appendChild(closeBtn);

        tab.addEventListener("click", () => this.activateTab(path));
        return tab;
    }

    activateTab(path) {
        this.tabsEl.querySelectorAll(".editor-tab").forEach(t => t.classList.remove("active"));
        this.container.querySelectorAll(".cm-editor").forEach(e => e.style.display = "none");

        const tab = this.tabs.get(path);
        if (tab) {
            tab.tabEl.classList.add("active");
            tab.view.dom.style.display = "";
            tab.view.focus();
            this.activeTab = path;
        }
    }

    closeTab(path) {
        const tab = this.tabs.get(path);
        if (!tab) return;

        if (tab.modified && !confirm(`"${path.split("/").pop()}" has unsaved changes. Close anyway?`)) {
            return;
        }

        tab.view.destroy();
        tab.tabEl.remove();
        this.tabs.delete(path);

        if (this.activeTab === path) {
            const remaining = [...this.tabs.keys()];
            if (remaining.length > 0) {
                this.activateTab(remaining[remaining.length - 1]);
            } else {
                this.activeTab = null;
            }
        }
    }

    async saveCurrent() {
        if (!this.activeTab) return;
        const tab = this.tabs.get(this.activeTab);
        if (!tab) return;

        const content = tab.view.state.doc.toString();
        try {
            await fetch(`/api/file?path=${encodeURIComponent(this.activeTab)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });
            tab.modified = false;
            tab.tabEl.classList.remove("modified");
        } catch (e) {
            alert("Save failed: " + e.message);
        }
    }

    setupKeyBindings() {
        document.addEventListener("keydown", (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                this.saveCurrent();
            }
        });
    }
}
```

- [ ] **Step 3: Add editor tab CSS**

Add to `style.css`:

```css
.editor-tab {
    display: flex;
    align-items: center;
    padding: 0 12px;
    height: 35px;
    border-right: 1px solid var(--border);
    cursor: pointer;
    font-size: 12px;
    color: var(--text-secondary);
    gap: 8px;
    flex-shrink: 0;
}

.editor-tab:hover {
    background: var(--bg-hover);
}

.editor-tab.active {
    background: var(--bg-primary);
    color: var(--text-primary);
    border-bottom: 1px solid var(--accent);
}

.editor-tab .tab-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.editor-tab .tab-close {
    font-size: 16px;
    line-height: 1;
    opacity: 0;
    transition: opacity 0.1s;
}

.editor-tab:hover .tab-close,
.editor-tab.active .tab-close {
    opacity: 1;
}

.editor-tab .tab-close:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
}

.editor-tab.modified .tab-name::before {
    content: "● ";
    color: var(--accent);
}
```

- [ ] **Step 4: Test editor**

Run: `python main.py &`
Open: `http://localhost:8080`
Click a file in the tree → should open in editor with syntax highlighting.
Open another file → tab appears. Click tabs → switch. Close tab → removes.
Ctrl+S → saves. Modified indicator (blue dot) appears on edit.
Kill server: `kill %1`

- [ ] **Step 5: Commit**

```bash
git add static/app.js static/style.css
git commit -m "feat: CodeMirror 6 multi-tab editor with syntax highlighting"
```

---

### Task 8: Frontend — xterm.js Terminal

**Files:**
- Modify: `static/app.js` (add terminal module)
- Modify: `static/index.html` (add xterm.js CDN)

**Interfaces:**
- Consumes: WebSocket at `/ws/terminal` from Task 5
- Produces: `clearTerminal()` function

- [ ] **Step 1: Add xterm.js CDN imports to index.html**

Add before `</head>` in `index.html`:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.min.css">
<script src="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.min.js"></script>
```

- [ ] **Step 2: Add terminal module to app.js**

Add after the `Editor` class in `app.js`:

```javascript
// === TERMINAL ===
class TerminalManager {
    constructor(containerEl) {
        this.container = containerEl;
        this.terminal = null;
        this.socket = null;
        this.fitAddon = null;
        this.init();
    }

    init() {
        this.terminal = new Terminal({
            theme: {
                background: "#1e1e1e",
                foreground: "#cccccc",
                cursor: "#cccccc",
                cursorAccent: "#1e1e1e",
                selectionBackground: "#264f78",
            },
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 13,
            cursorBlink: true,
        });

        this.fitAddon = new FitAddon.FitAddon();
        this.terminal.loadAddon(this.fitAddon);
        this.terminal.open(this.container);
        this.fitAddon.fit();

        this.connect();
        this.setupResize();
    }

    connect() {
        const protocol = location.protocol === "https:" ? "wss:" : "ws:";
        this.socket = new WebSocket(`${protocol}//${location.host}/ws/terminal`);

        this.socket.onopen = () => {
            this.terminal.onData((data) => {
                if (this.socket.readyState === WebSocket.OPEN) {
                    this.socket.send(JSON.stringify({ data }));
                }
            });
            this.sendResize();
        };

        this.socket.onmessage = (event) => {
            if (event.data instanceof Blob) {
                event.data.arrayBuffer().then(buf => {
                    this.terminal.write(new Uint8Array(buf));
                });
            } else {
                this.terminal.write(event.data);
            }
        };

        this.socket.onclose = () => {
            this.terminal.write("\r\n\x1b[31m[Connection closed]\x1b[0m\r\n");
            setTimeout(() => this.connect(), 2000);
        };

        this.terminal.onResize(({ rows, cols }) => {
            if (this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({ resize: true, rows, cols }));
            }
        });
    }

    sendResize() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                resize: true,
                rows: this.terminal.rows,
                cols: this.terminal.cols,
            }));
        }
    }

    setupResize() {
        const observer = new ResizeObserver(() => {
            this.fitAddon.fit();
            this.sendResize();
        });
        observer.observe(this.container);
    }

    clear() {
        this.terminal.clear();
    }

    focus() {
        this.terminal.focus();
    }
}
```

- [ ] **Step 3: Test terminal**

Run: `python main.py &`
Open: `http://localhost:8080`
Type `ls` in terminal → output appears.
Type `echo hello` → output appears.
Terminal reconnects on WebSocket drop.
Kill server: `kill %1`

- [ ] **Step 4: Commit**

```bash
git add static/app.js static/index.html
git commit -m "feat: xterm.js terminal with WebSocket PTY"
```

---

### Task 9: Frontend — Wiring Everything Together

**Files:**
- Modify: `static/app.js` (init all modules, connect file browser to editor)
- Modify: `static/index.html` (add clear button handler)

**Interfaces:**
- Consumes: `FileBrowser` from Task 6
- Consumes: `Editor` from Task 7
- Consumes: `TerminalManager` from Task 8

- [ ] **Step 1: Add init code at bottom of app.js**

Add at the very end of `app.js`:

```javascript
// === INIT ===
document.addEventListener("DOMContentLoaded", () => {
    const editorContainer = document.getElementById("editor-container");
    const tabsContainer = document.getElementById("editor-tabs");
    const fileTreeContainer = document.getElementById("file-tree");
    const terminalContainer = document.getElementById("terminal");

    const editor = new Editor(editorContainer, tabsContainer);

    const fileBrowser = new FileBrowser(fileTreeContainer, async (path) => {
        try {
            const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            editor.openFile(path, data.content);
        } catch (e) {
            alert("Failed to open file: " + e.message);
        }
    });

    const terminal = new TerminalManager(terminalContainer);

    // Clear terminal button
    document.getElementById("btn-terminal-clear").addEventListener("click", () => {
        terminal.clear();
    });

    // Resize editor on window resize
    window.addEventListener("resize", () => {
        editor.tabs.forEach(tab => tab.view.requestMeasure());
    });
});
```

- [ ] **Step 2: Update FileBrowser constructor call**

The `FileBrowser` class constructor already calls `this.setupDropZone()` — verify it's there. If not, add it to the constructor.

- [ ] **Step 3: Test full integration**

Run: `python main.py &`
Open: `http://localhost:8080`
Test flow:
1. File browser loads → shows tree
2. Click file → opens in editor with syntax highlighting
3. Edit file → modified indicator appears
4. Ctrl+S → saves, indicator clears
5. Open terminal → type commands → output appears
6. Drag file onto browser → uploads
7. Right-click file → delete/rename/download
8. New file via context menu → appears in tree
Kill server: `kill %1`

- [ ] **Step 4: Commit**

```bash
git add static/app.js
git commit -m "feat: wire file browser, editor, and terminal together"
```

---

### Task 10: Polish & Error Handling

**Files:**
- Modify: `static/app.js` (error handling, edge cases)
- Modify: `main.py` (CORS, error responses)
- Modify: `static/style.css` (loading states, empty states)

**Interfaces:**
- No new APIs, refinement of existing

- [ ] **Step 1: Add CORS middleware to main.py**

Add after `app = FastAPI()`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- [ ] **Step 2: Add loading/empty states to editor**

Add to `Editor` class in `app.js`, in the constructor:

```javascript
    showEmptyState() {
        this.container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);flex-direction:column;gap:12px;">
                <div style="font-size:48px;">📝</div>
                <div>No file open</div>
                <div style="font-size:11px;">Click a file in the sidebar to edit</div>
            </div>`;
    }
```

Call `this.showEmptyState()` at end of constructor.

- [ ] **Step 3: Handle large files gracefully**

In `Editor.openFile()`, add a check before creating the view:

```javascript
        if (content.length > 1_000_000) {
            if (!confirm(`This file is ${(content.length / 1_000_000).toFixed(1)}MB. Open anyway?`)) {
                return;
            }
        }
```

- [ ] **Step 4: Add new file button to sidebar header**

In `index.html`, the sidebar header already has a `btn-new-folder` button. Let's also add a new file button. But keep it simple — the context menu already handles this. Just verify the `+` button works by wiring it:

In the `DOMContentLoaded` init block, add:

```javascript
    document.getElementById("btn-new-folder").addEventListener("click", async () => {
        const name = prompt("New file name (relative to root):");
        if (!name) return;
        try {
            await fetch(`/api/file?path=${encodeURIComponent(name)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: "" }),
            });
            fileBrowser.loadTree();
        } catch (e) {
            alert("Failed: " + e.message);
        }
    });
```

- [ ] **Step 5: Test edge cases**

Run: `python main.py &`
Test:
1. Open a large file (>1MB) → confirmation dialog
2. Open non-existent file → error handled
3. Save with no file open → no crash
4. Terminal disconnect/reconnect → works
Kill server: `kill %1`

- [ ] **Step 6: Commit**

```bash
git add main.py static/app.js static/style.css
git commit -m "feat: error handling, CORS, edge cases"
```

---

### Task 11: Final Integration Test

**Files:**
- No changes, testing only

- [ ] **Step 1: Clean install test**

```bash
cd /home/valerio/lavoro/appo/web-work
rm -rf __pycache__
pip install -r requirements.txt
python main.py
```

- [ ] **Step 2: Test all features end-to-end**

Open: `http://localhost:8080`

| Feature | Steps | Expected |
|---------|-------|----------|
| File tree loads | Open page | Sidebar shows directory tree |
| Expand folder | Click folder | Subfolder contents appear |
| Open file | Click file | Editor opens with syntax highlighting |
| Multi-tab | Open 3+ files | Tabs appear, can switch |
| Close tab | Click × | Tab closes, modified check |
| Save file | Edit + Ctrl+S | Saved, indicator clears |
| New file | Right-click → New File | File created, appears in tree |
| Delete file | Right-click → Delete | Confirm → file removed |
| Rename | Right-click → Rename | Prompt → file renamed |
| Upload | Drag file onto browser | File uploaded, tree refreshes |
| Download | Right-click → Download | File downloads |
| Terminal | Type commands | Output appears |
| Terminal resize | Resize browser | Terminal fits new size |
| Terminal reconnect | Kill server + restart | Auto-reconnects |

- [ ] **Step 3: Commit final state**

```bash
git add -A
git commit -m "feat: web editor v1 complete — file browser, multi-tab editor, terminal"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Project scaffolding | main.py, index.html, style.css, app.js |
| 2 | File browser API | main.py |
| 3 | File read/write API | main.py |
| 4 | Upload/download API | main.py |
| 5 | WebSocket terminal | main.py |
| 6 | Frontend file browser | app.js, style.css |
| 7 | CodeMirror 6 editor | app.js, style.css |
| 8 | xterm.js terminal | app.js, index.html |
| 9 | Wire everything together | app.js |
| 10 | Polish & error handling | app.js, main.py, style.css |
| 11 | Final integration test | — |

**Total estimated time:** 2-3 hours of implementation
