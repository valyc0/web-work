# WebWork

Editor web personale — come VSCode nel browser. File browser, editor multi-tab con syntax highlighting, terminale integrato.

## Features

- **File browser** con drag-and-drop upload, crea/rinomina/elimina file e cartelle
- **Editor multi-tab** con syntax highlighting (JS, Python, JSON, HTML, CSS, YAML), Ctrl+S per salvare
- **Terminale** con supporto multipli tab (xterm.js + PTY via WebSocket)
- **Multi-selezione** — Ctrl+Click o Shift+Click per selezionare più file, Esc per deselezionare
- **Tab management** — tasto destro sulla barra tab per chiudere tutti, solo aperti, o solo salvati
- **Drag & drop** per ridimensionare il pannello terminale
- **Dark theme**

## Quick Start

```bash
# Clona e installa
git clone <repo-url>
cd web-work
./install.sh

# Avvia
./start.sh
```

Apri `http://localhost:8080` nel browser.

Per fermare: `./stop.sh`

### Personalizzazione

```bash
# Cartella specifica
./start.sh /path/to/your/project

# Porta custom
./start.sh /path/to/project 3000

#oppure con variabile d'ambiente
WEBWORK_PORT=3000 ./start.sh
```

## Build Eseguibile Standalone

Puoi creare un eseguibile unico con PyInstaller (non serve Python sul sistema target):

```bash
source .venv/bin/activate
pip install pyinstaller
./build.sh
```

Genera `dist/webwork` (Linux) o `dist/webwork.exe` (Windows).

### Esecuzione dopo la distribuzione

Dopo aver copiato l'eseguibile su un'altra macchina:

```bash
# Usa la directory corrente come root
./webwork

# Specifica una cartella diversa
WEBWORK_ROOT=/path/to/project ./webwork

# Specifica porta e cartella
WEBWORK_ROOT=/path/to/project WEBWORK_PORT=3000 ./webwork
```

## Struttura

```
web-work/
├── main.py              # Backend FastAPI (API REST + WebSocket terminale)
├── static/
│   ├── index.html       # SPA shell
│   ├── app.js           # Frontend JS (FileBrowser, Editor, Terminal)
│   └── style.css        # Dark theme, layout 3 pannelli
├── install.sh           # Primo setup (crea venv + installa dipendenze)
├── start.sh             # Avvia il server
├── stop.sh              # Ferma il server
├── build.sh             # Build eseguibile con PyInstaller
├── requirements.txt     # Dipendenze Python
└── .gitignore
```

## API

| Endpoint | Metodo | Descrizione |
|---|---|---|
| `/api/tree` | GET | Albero file (opzionale `?path=`) |
| `/api/file` | GET | Leggi file (`?path=`) |
| `/api/file` | PUT | Scrivi file (`?path=` + JSON body) |
| `/api/file` | DELETE | Elimina file (`?path=`) |
| `/api/mkdir` | POST | Crea cartella (`?path=`) |
| `/api/rename` | POST | Rinomina (`{ old_path, new_path }`) |
| `/api/upload` | POST | Upload file (multipart) |
| `/api/download` | GET | Download file (`?path=`) |
| `/ws/terminal` | WebSocket | Terminale PTY |

## Variabili d'Ambiente

- `WEBWORK_ROOT` — cartella radice da servire (default: directory corrente)
- `WEBWORK_PORT` — porta del server (default: 8080)

## Dipendenze

- Python 3.10+
- fastapi, uvicorn, aiofiles, python-multipart
