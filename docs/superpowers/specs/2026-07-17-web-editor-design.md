# Web Editor — Design Spec

Personal web-based code editor with file browser, multi-tab editor, and terminal, similar to VSCode/OpenCode.

## Requirements

- **File browser** (left sidebar): tree view of server directory, upload/download files and directories
- **Multi-tab editor** (center): syntax highlighting (CodeMirror 6), create new files, open multiple files
- **Webshell terminal** (bottom): real terminal on the server (PTY), xterm.js in browser
- **Single user**: no auth, personal use only
- **Stack**: Python (FastAPI) + vanilla HTML/JS/CSS frontend

## Architecture

```
Browser (SPA)                    FastAPI Server
┌──────────────┬─────────────┐   ┌──────────────────┐
│ File Browser │   Editor    │   │  REST API         │
│  (left)      │  (center)   │───│  /api/files/*     │
│              │  CodeMirror6 │   │  /api/upload      │
├──────────────┴─────────────┤   │  /api/download    │
│     Terminal (xterm.js)    │───│  WebSocket /ws/*  │
└────────────────────────────┘   │  - /ws/terminal   │
                                 │  - /ws/files      │
                                 └──────────────────┘
```

## Backend (FastAPI)

### Dependencies
- `fastapi`
- `uvicorn[standard]` (WebSocket support)
- `python-multipart` (file upload)
- `aiofiles` (async file I/O)

### REST Endpoints
- `GET /api/files?path=` — list directory contents (name, type, size, mtime)
- `GET /api/file?path=` — read file content
- `PUT /api/file?path=` — create/update file
- `DELETE /api/file?path=` — delete file or directory
- `POST /api/upload?path=` — upload file(s)
- `GET /api/download?path=` — download file (streaming)
- `GET /api/tree?path=` — get directory tree for sidebar
- `POST /api/mkdir?path=` — create directory
- `POST /api/rename` — rename file/directory

### WebSocket Endpoints
- `/ws/terminal` — PTY shell (bidirectional: spawn `bash`, pipe stdin/stdout via WS)

### Security
- **Path traversal protection**: all paths validated against a configurable root directory
- Default root: `$HOME` or `/home/valerio`
- No shell injection: PTY spawned via `pty.spawn()` with user's default shell

## Frontend

### Layout (CSS Grid)
```
┌─────────────┬──────────────────────────┐
│             │                          │
│   File      │      Editor Tabs         │
│   Browser   │      CodeMirror 6        │
│   (250px)   │      (flex)              │
│             │                          │
├─────────────┴──────────────────────────┤
│        Terminal (xterm.js)             │
│        (200px)                         │
└────────────────────────────────────────┘
```

### File Browser
- Recursive tree view (collapsible folders)
- Click file → opens in editor tab
- Right-click context menu: rename, delete, download, new file, new folder
- Drag-drop upload zone
- Visual indicators: folder icons, file type icons

### Editor (CodeMirror 6)
- Multi-tab bar (open files list, click to switch, close button per tab)
- Syntax highlighting for common languages (auto-detect by extension)
- Line numbers, bracket matching
- Ctrl+S → save file (PUT to API)
- New file button → empty tab, prompt for filename on save
- Modified indicator (dot on tab)

### Terminal (xterm.js)
- WebSocket connection to `/ws/terminal`
- Auto-resize on panel resize (send `resize` message)
- Copy/paste support (Ctrl+Shift+C/V)
- Standard terminal styling (dark theme)

### Styling
- Dark theme (VSCode-like dark)
- Monospace font (JetBrains Mono or Fira Code via CDN)
- Minimal CSS, no framework (vanilla)

## File Structure

```
web-work/
├── main.py                 # FastAPI app, all routes
├── requirements.txt
├── static/
│   ├── index.html          # Single page app (CDN imports for CodeMirror, xterm.js)
│   ├── app.js              # Frontend logic
│   └── style.css           # Dark theme styles
└── docs/
```

## Data Flow

### Open file
1. Click file in browser → `GET /api/file?path=/path/to/file`
2. Response: `{ content: "...", language: "python" }`
3. Create new CodeMirror tab, mount editor instance
4. Add tab to tab bar

### Save file
1. Ctrl+S or explicit save → `PUT /api/file?path=...` with body `{ content: "..." }`
2. Success: remove modified indicator

### Terminal
1. Page load → connect WebSocket to `/ws/terminal`
2. User types → send `{ data: "..." }` via WS
3. Server pipes to PTY → sends `{ data: "output" }` back
4. On resize → send `{ cols: N, rows: N }`

### Upload
1. Drag file onto browser → `POST /api/upload?path=/target/dir`
2. Multipart form data
3. Refresh file list on completion

## MVP Scope (v1)
- File browser with tree view
- Upload single files (no directory upload yet)
- Download single files
- Multi-tab editor with syntax highlighting
- Create new files
- Save files (Ctrl+S)
- Delete files
- Webshell terminal
- Dark theme

## Out of Scope (v1)
- Directory upload/download (tar)
- Git integration
- Search/replace across files
- Terminal multiplexing
- Multi-user auth
- File watching (auto-refresh only on manual action)

## Success Criteria
- `python main.py` starts server, open browser → see 3-panel layout
- Can navigate filesystem, open files, edit, save
- Can run shell commands in terminal
- Can upload/download files
- No crashes on common operations
