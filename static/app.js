// WebWork - Frontend Logic

// === FILE BROWSER ===
class FileBrowser {
    constructor(containerEl, onFileOpen, toolbarEl) {
        this.container = containerEl;
        this.onFileOpen = onFileOpen;
        this.toolbarEl = toolbarEl;
        this.activePath = null;
        this.contextMenu = null;
        this.selectedItems = new Set();
        this.loadTree();
        this.setupDropZone();
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") this.clearSelection();
        });
    }

    async loadTree() {
        try {
            const res = await fetch("/api/tree");
            const tree = await res.json();
            this.container.innerHTML = "";
            this.selectedItems.clear();
            this.updateToolbar();
            this.renderTree(tree, this.container, 0);
        } catch (e) {
            console.error("Failed to load tree:", e);
        }
    }

    async navigateToPath(targetPath) {
        await this.loadTree();
        if (!targetPath) return;
        const parts = targetPath.split("/").filter(Boolean);
        let current = "";
        for (const part of parts) {
            current = current ? `${current}/${part}` : part;
            const el = this.container.querySelector(`.tree-item[data-path="${current}"]`);
            if (el && el.classList.contains("dir")) {
                const existing = el.nextElementSibling;
                if (!existing || !existing.classList.contains("tree-children")) {
                    el.querySelector(".arrow").classList.add("open");
                    const container = document.createElement("div");
                    container.className = "tree-children";
                    el.parentNode.insertBefore(container, el.nextSibling);
                    await this.loadSubDir(current, container, parts.indexOf(part) + 1);
                }
            }
        }
        const finalEl = this.container.querySelector(`.tree-item[data-path="${targetPath}"]`);
        if (finalEl) {
            finalEl.scrollIntoView({ block: "center" });
            finalEl.classList.add("active");
        }
    }

    renderTree(items, parent, depth) {
        for (const item of items) {
            const el = document.createElement("div");
            el.className = `tree-item ${item.type}`;
            el.style.setProperty("--depth", depth);
            el.dataset.path = item.path;

            const arrow = document.createElement("span");
            arrow.className = "arrow";
            el.appendChild(arrow);

            const icon = document.createElement("span");
            icon.className = "icon";
            icon.textContent = item.type === "directory" ? "\uD83D\uDCC1" : this.getFileIcon(item.name);
            el.appendChild(icon);

            const name = document.createElement("span");
            name.className = "name";
            name.textContent = item.name;
            el.appendChild(name);

            el.addEventListener("click", (e) => {
                e.stopPropagation();
                if (item.type === "directory") {
                    this.toggleDir(el, item, depth);
                } else if (e.ctrlKey || e.metaKey) {
                    this.toggleSelect(item);
                } else if (e.shiftKey) {
                    this.rangeSelect(item, el);
                } else {
                    this.onFileOpen(item.path);
                    this.setActive(el);
                }
            });

            el.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (item.type === "file" && !this.selectedItems.has(item.path)) {
                    this.clearSelection();
                    this.toggleSelect(item);
                }
                this.showContextMenu(e, item);
            });

            parent.appendChild(el);
        }
    }

    getFileIcon(name) {
        const ext = name.split(".").pop().toLowerCase();
        const icons = {
            py: "\uD83D\uDC0D", js: "\uD83D\uDCDC", ts: "\uD83D\uDCDC", html: "\uD83C\uDF10", css: "\uD83C\uDFA8",
            json: "\uD83D\uDCCB", yaml: "\uD83D\uDCCB", yml: "\uD83D\uDCCB", md: "\uD83D\uDCDD", txt: "\uD83D\uDCC4",
            sh: "\u2699\uFE0F", bash: "\u2699\uFE0F", zsh: "\u2699\uFE0F",
        };
        return icons[ext] || "\uD83D\uDCC4";
    }

    toggleSelect(item) {
        if (this.selectedItems.has(item.path)) {
            this.selectedItems.delete(item.path);
        } else {
            this.selectedItems.add(item.path);
        }
        this.updateItemStyle(item.path);
        this.updateToolbar();
    }

    rangeSelect(item, el) {
        const allItems = [...this.container.querySelectorAll(".tree-item.file")];
        const lastIdx = allItems.findIndex(e => e.dataset.path === [...this.selectedItems].pop());
        const currentIdx = allItems.indexOf(el);
        if (lastIdx === -1) {
            this.toggleSelect(item);
            return;
        }
        const start = Math.min(lastIdx, currentIdx);
        const end = Math.max(lastIdx, currentIdx);
        for (let i = start; i <= end; i++) {
            const path = allItems[i].dataset.path;
            this.selectedItems.add(path);
            allItems[i].classList.add("selected");
        }
        this.updateToolbar();
    }

    clearSelection() {
        this.selectedItems.clear();
        this.container.querySelectorAll(".tree-item.selected").forEach(el => el.classList.remove("selected"));
        this.updateToolbar();
    }

    updateItemStyle(path) {
        const el = this.container.querySelector(`.tree-item[data-path="${path}"]`);
        if (el) {
            el.classList.toggle("selected", this.selectedItems.has(path));
        }
    }

    updateToolbar() {
        if (!this.toolbarEl) return;
        const count = this.selectedItems.size;
        if (count === 0) {
            this.toolbarEl.style.display = "none";
            return;
        }
        this.toolbarEl.style.display = "flex";
        this.toolbarEl.querySelector(".selection-count").textContent = `${count} selected`;
    }

    getSelectedPaths() {
        return [...this.selectedItems];
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

        const hasSelection = this.selectedItems.size > 0;

        const actions = [
            { label: "New File", action: () => this.newFile(item) },
            { label: "New Folder", action: () => this.newFolder(item) },
            { type: "separator" },
        ];

        if (hasSelection && this.selectedItems.size > 1) {
            actions.push(
                { label: `Open ${this.selectedItems.size} files`, action: () => this.openSelected() },
                { type: "separator" },
                { label: `Delete ${this.selectedItems.size} files`, action: () => this.deleteSelected() },
                { label: `Download ${this.selectedItems.size} files`, action: () => this.downloadSelected() },
            );
        } else {
            actions.push(
                { label: "Rename", action: () => this.renameItem(item) },
                { label: "Delete", action: () => this.deleteItem(item) },
                { type: "separator" },
                { label: "Download", action: () => this.downloadItem(item) },
            );
        }

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

    async openSelected() {
        const paths = this.getSelectedPaths();
        this.clearSelection();
        for (const path of paths) {
            try {
                const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
                if (!res.ok) continue;
                const data = await res.json();
                await this.onFileOpen(path, data.content);
            } catch (e) {
                console.error("Failed to open:", path, e);
            }
        }
    }

    async deleteSelected() {
        const paths = this.getSelectedPaths();
        if (!confirm(`Delete ${paths.length} files?`)) return;
        let ok = 0, fail = 0;
        for (const path of paths) {
            try {
                await fetch(`/api/file?path=${encodeURIComponent(path)}`, { method: "DELETE" });
                ok++;
            } catch (e) {
                fail++;
            }
        }
        this.clearSelection();
        this.loadTree();
        if (fail) alert(`Deleted ${ok}, failed ${fail}`);
    }

    downloadSelected() {
        const paths = this.getSelectedPaths();
        for (const path of paths) {
            window.open(`/api/download?path=${encodeURIComponent(path)}`, "_blank");
        }
        this.clearSelection();
    }

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
}

// === EDITOR ===
class Editor {
    constructor(containerEl, tabsEl) {
        this.container = containerEl;
        this.tabsEl = tabsEl;
        this.tabs = new Map();
        this.activeTab = null;
        this.cmModules = null;
        this.showEmptyState();
        this.setupKeyBindings();
        this.setupTabsContextMenu();
    }

    showEmptyState() {
        this.container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);flex-direction:column;gap:12px;">
                <div style="font-size:48px;">\uD83D\uDCDD</div>
                <div>No file open</div>
                <div style="font-size:11px;">Click a file in the sidebar to edit</div>
            </div>`;
    }

    async loadModules() {
        if (this.cmModules) return this.cmModules;
        const [
            { basicSetup, EditorView },
            { javascript },
            { python },
            { json },
            { html },
            { css },
            { yaml },
        ] = await Promise.all([
            import("https://esm.sh/codemirror@6.0.1"),
            import("https://esm.sh/@codemirror/lang-javascript@6"),
            import("https://esm.sh/@codemirror/lang-python@6"),
            import("https://esm.sh/@codemirror/lang-json@6"),
            import("https://esm.sh/@codemirror/lang-html@6"),
            import("https://esm.sh/@codemirror/lang-css@6"),
            import("https://esm.sh/@codemirror/lang-yaml@6"),
        ]);
        this.cmModules = { basicSetup, EditorView, javascript, python, json, html, css, yaml };
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

        if (content.length > 1_000_000) {
            if (!confirm(`This file is ${(content.length / 1_000_000).toFixed(1)}MB. Open anyway?`)) {
                return;
            }
        }

        let mods;
        try {
            mods = await this.loadModules();
        } catch (e) {
            console.error("Failed to load CodeMirror modules:", e);
            alert("Failed to load editor modules. Check your internet connection.\n" + e.message);
            return;
        }

        const { basicSetup, EditorView, ...langs } = mods;

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

        this.container.innerHTML = "";

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
        closeBtn.textContent = "\u00D7";
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
                this.showEmptyState();
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

    setupTabsContextMenu() {
        this.tabsEl.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            if (this.tabs.size === 0) return;

            const menu = document.createElement("div");
            menu.className = "context-menu";

            const actions = [
                { label: "Close All", action: () => this.closeAllTabs() },
                { label: "Close Others", action: () => this.closeOtherTabs() },
                { type: "separator" },
                { label: "Close Saved", action: () => this.closeSavedTabs() },
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
                    btn.addEventListener("click", (ev) => {
                        ev.stopPropagation();
                        menu.remove();
                        action.action();
                    });
                    menu.appendChild(btn);
                }
            }

            menu.style.left = e.clientX + "px";
            menu.style.top = e.clientY + "px";
            document.body.appendChild(menu);

            const hide = () => {
                menu.remove();
                document.removeEventListener("click", hide);
            };
            setTimeout(() => document.addEventListener("click", hide), 0);
        });
    }

    closeAllTabs() {
        const paths = [...this.tabs.keys()];
        for (const path of paths) {
            const tab = this.tabs.get(path);
            if (tab.modified) {
                if (!confirm(`"${path.split("/").pop()}" has unsaved changes. Close anyway?`)) continue;
            }
            tab.view.destroy();
            tab.tabEl.remove();
            this.tabs.delete(path);
        }
        this.activeTab = null;
        this.showEmptyState();
    }

    closeOtherTabs() {
        if (!this.activeTab) return;
        const active = this.activeTab;
        const paths = [...this.tabs.keys()].filter(p => p !== active);
        for (const path of paths) {
            const tab = this.tabs.get(path);
            if (tab.modified) {
                if (!confirm(`"${path.split("/").pop()}" has unsaved changes. Close anyway?`)) continue;
            }
            tab.view.destroy();
            tab.tabEl.remove();
            this.tabs.delete(path);
        }
    }

    closeSavedTabs() {
        const paths = [...this.tabs.keys()];
        for (const path of paths) {
            const tab = this.tabs.get(path);
            if (tab.modified) continue;
            tab.view.destroy();
            tab.tabEl.remove();
            this.tabs.delete(path);
        }
        if (!this.activeTab || !this.tabs.has(this.activeTab)) {
            const remaining = [...this.tabs.keys()];
            if (remaining.length > 0) {
                this.activateTab(remaining[remaining.length - 1]);
            } else {
                this.activeTab = null;
                this.showEmptyState();
            }
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

// === TERMINAL ===
class TerminalInstance {
    constructor(containerEl, id, onClose) {
        this.container = document.createElement("div");
        this.container.className = "terminal-instance";
        this.container.style.display = "none";
        containerEl.appendChild(this.container);

        this.id = id;
        this.terminal = null;
        this.socket = null;
        this.fitAddon = null;
        this.onClose = onClose;
        this.tabEl = null;
        this._onDataBound = null;
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

        this._onDataBound = (data) => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({ data }));
            }
        };
        this.terminal.onData(this._onDataBound);

        this.connect();
        this.setupResize();
    }

    connect() {
        const protocol = location.protocol === "https:" ? "wss:" : "ws:";
        this.socket = new WebSocket(`${protocol}//${location.host}/ws/terminal`);

        this.socket.onopen = () => {
            this.fitAddon.fit();
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
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
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

    fit() {
        this.fitAddon.fit();
    }

    setupResize() {
        const observer = new ResizeObserver(() => {
            this.fitAddon.fit();
            this.sendResize();
        });
        observer.observe(this.container);
    }

    show() {
        this.container.style.display = "";
        this.fit();
        this.terminal.focus();
    }

    hide() {
        this.container.style.display = "none";
    }

    destroy() {
        if (this.socket) this.socket.close();
        this.terminal.dispose();
        this.container.remove();
    }

    clear() {
        this.terminal.clear();
    }

    getPwd() {
        return new Promise((resolve) => {
            const marker = "__PWD_" + Math.random().toString(36).slice(2) + "__";
            let buffer = "";
            const origHandler = this._onDataBound;
            const timeout = setTimeout(() => {
                this._onDataBound = origHandler;
                resolve(null);
            }, 2000);
            this._onDataBound = (data) => {
                origHandler(data);
                buffer += data;
                if (buffer.includes(marker)) {
                    clearTimeout(timeout);
                    this._onDataBound = origHandler;
                    const match = buffer.match(new RegExp(`${marker}\\n(.+?)\\n${marker}`));
                    resolve(match ? match[1] : null);
                }
            };
            this.terminal.onData(this._onDataBound);
            this.socket.send(JSON.stringify({ data: `echo "${marker}"\\npwd\\necho "${marker}"\\n` }));
        });
    }

    focus() {
        this.terminal.focus();
    }
}

class TerminalManager {
    constructor(panelEl) {
        this.panel = panelEl;
        this.instances = [];
        this.activeId = null;
        this.nextId = 1;

        this.terminalsContainer = document.createElement("div");
        this.terminalsContainer.id = "terminals-container";
        this.panel.appendChild(this.terminalsContainer);

        this.createNew();
    }

    createNew() {
        const id = this.nextId++;
        const instance = new TerminalInstance(this.terminalsContainer, id, () => this.remove(id));

        const tab = document.createElement("div");
        tab.className = "terminal-tab";
        tab.dataset.id = id;

        const name = document.createElement("span");
        name.className = "terminal-tab-name";
        name.textContent = `Terminal ${id}`;
        tab.appendChild(name);

        const closeBtn = document.createElement("span");
        closeBtn.className = "terminal-tab-close";
        closeBtn.textContent = "\u00D7";
        closeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.remove(id);
        });
        tab.appendChild(closeBtn);

        tab.addEventListener("click", () => this.activate(id));

        instance.tabEl = tab;
        this.instances.push(instance);

        const tabsContainer = this.panel.querySelector("#terminal-tabs");
        tabsContainer.appendChild(tab);

        this.activate(id);
        return instance;
    }

    activate(id) {
        this.instances.forEach(inst => {
            inst.hide();
            inst.tabEl.classList.remove("active");
        });

        const inst = this.instances.find(i => i.id === id);
        if (inst) {
            inst.show();
            inst.tabEl.classList.add("active");
            this.activeId = id;
        }
    }

    remove(id) {
        if (this.instances.length <= 1) return;

        const idx = this.instances.findIndex(i => i.id === id);
        if (idx === -1) return;

        const inst = this.instances[idx];
        inst.tabEl.remove();
        inst.destroy();
        this.instances.splice(idx, 1);

        if (this.activeId === id) {
            const newIdx = Math.min(idx, this.instances.length - 1);
            this.activate(this.instances[newIdx].id);
        }
    }

    getActive() {
        return this.instances.find(i => i.id === this.activeId);
    }

    getPwd() {
        const inst = this.getActive();
        return inst ? inst.getPwd() : Promise.resolve(null);
    }

    clear() {
        const inst = this.getActive();
        if (inst) inst.clear();
    }

    fit() {
        const inst = this.getActive();
        if (inst) inst.fit();
    }
}

// === INIT ===
document.addEventListener("DOMContentLoaded", () => {
    const editorContainer = document.getElementById("editor-container");
    const tabsContainer = document.getElementById("editor-tabs");
    const fileTreeContainer = document.getElementById("file-tree");
    const selectionToolbar = document.getElementById("selection-toolbar");
    const terminalPanel = document.getElementById("terminal-panel");

    const editor = new Editor(editorContainer, tabsContainer);

    const fileBrowser = new FileBrowser(fileTreeContainer, async (path, preloadedContent) => {
        try {
            let content = preloadedContent;
            if (!content && content !== "") {
                const res = await fetch(`/api/file?path=${encodeURIComponent(path)}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                content = data.content;
            }
            await editor.openFile(path, content);
        } catch (e) {
            console.error("Failed to open file:", e);
            alert("Failed to open file: " + e.message);
        }
    }, selectionToolbar);

    document.getElementById("btn-open-selected").addEventListener("click", () => fileBrowser.openSelected());
    document.getElementById("btn-delete-selected").addEventListener("click", () => fileBrowser.deleteSelected());
    document.getElementById("btn-download-selected").addEventListener("click", () => fileBrowser.downloadSelected());

    const terminal = new TerminalManager(terminalPanel);

    document.getElementById("btn-terminal-clear").addEventListener("click", () => {
        terminal.clear();
    });

    document.getElementById("btn-terminal-new").addEventListener("click", () => {
        terminal.createNew();
    });

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

    document.getElementById("btn-reload-tree").addEventListener("click", () => {
        fileBrowser.loadTree();
    });

    document.getElementById("btn-follow-dir").addEventListener("click", async () => {
        const inst = terminal.getActive();
        if (!inst) return;
        const pwd = await inst.getPwd();
        if (pwd) fileBrowser.navigateToPath(pwd);
    });

    window.addEventListener("resize", () => {
        editor.tabs.forEach(tab => tab.view.requestMeasure());
    });

    // === DRAG HANDLE ===
    const dragHandle = document.getElementById("terminal-drag-handle");
    const rightPanel = document.getElementById("right-panel");

    dragHandle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        dragHandle.classList.add("dragging");
        const startY = e.clientY;
        const startHeight = terminalPanel.offsetHeight;

        const onMove = (e) => {
            const delta = startY - e.clientY;
            const panelHeight = rightPanel.offsetHeight;
            let newHeight = startHeight + delta;
            newHeight = Math.max(60, Math.min(panelHeight - 100, newHeight));
            terminalPanel.style.height = newHeight + "px";
            terminal.fit();
        };

        const onUp = () => {
            dragHandle.classList.remove("dragging");
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    });
});
