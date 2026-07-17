# Task 1-5 Report: Web Editor Backend

**Date:** 2026-07-17  
**Status:** DONE

## What Was Implemented

Complete backend for a personal web editor with REST API and WebSocket terminal.

### Files Created

| File | Description |
|------|-------------|
| `requirements.txt` | fastapi, uvicorn[standard], aiofiles, python-multipart |
| `main.py` | FastAPI app with all routes (440 lines) |
| `static/index.html` | SPA shell with 3-panel grid layout |
| `static/style.css` | Dark theme CSS (VS Code-style variables) |
| `static/app.js` | Empty placeholder with console.log |

### API Endpoints (Task 2-5)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tree` | GET | Recursive directory tree (max depth 5, hidden files filtered) |
| `/api/files` | GET | Flat directory listing with size/mtime metadata |
| `/api/file` | GET | Read file content with MIME type |
| `/api/file` | PUT | Create/update file (creates parent dirs) |
| `/api/file` | DELETE | Delete file or directory |
| `/api/mkdir` | POST | Create directory (recursive) |
| `/api/rename` | POST | Rename/move file or directory |
| `/api/upload` | POST | Multipart file upload |
| `/api/download` | GET | Streaming file download |
| `/ws/terminal` | WebSocket | PTY shell with TIOCSWINSZ resize support |

### Security

- All paths validated via `safe_path()` against ROOT_DIR (default `$HOME`)
- Path traversal blocked — requests to `/tmp` return 403
- Hidden files (`.dotfiles`) filtered from tree (except `.gitignore`)

### WebSocket Terminal

- Uses `pty.openpty()` for PTY creation
- Non-blocking I/O with `fcntl` + `O_NONBLOCK`
- Terminal resize via `TIOCSWINSZ` ioctl (0x5414)
- Sets `TERM=xterm-256color`
- Working directory set to ROOT_DIR
- Proper cleanup on disconnect (close fd, kill child, waitpid)

## Test Results

| Test | Result |
|------|--------|
| `GET /` | 200 — serves index.html |
| `GET /api/tree` | 200 — returns JSON tree |
| `GET /api/file` (read) | 200 — returns content + mime |
| `PUT /api/file` (write) | 200 — creates file |
| `POST /api/mkdir` | 200 — creates directory |
| `POST /api/rename` | 200 — renames file |
| `DELETE /api/file` | 200 — deletes file |
| `POST /api/upload` | 200 — uploads file |
| `GET /api/download` | 200 — streams file |
| Path traversal (`/tmp/...`) | 403 — correctly blocked |

All tests passed. Server starts on `0.0.0.0:8080`.

## Concerns

1. **Python command:** System uses `python3`, not `python`. Server runs with `python3 main.py`.
2. **Large files:** Tree endpoint has no size limit — very large directories could be slow.
3. **Concurrent access:** No file locking — concurrent writes could corrupt files.
4. **Binary files:** File read endpoint uses text mode — binary files may produce garbled output.
