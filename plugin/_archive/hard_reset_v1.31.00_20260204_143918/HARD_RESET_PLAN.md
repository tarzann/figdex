# Hard Reset Plan — FigDex v1.31.00

## PLAN (concise)

1. **Archive** — Create `_archive/hard_reset_v1.31.00_<timestamp>/`, copy full plugin (no node_modules/dist), add README "Reference only — do not execute".
2. **Clean runtime** — Remove all legacy JS from ui.html (keep markup + CSS). Keep only: manifest.json, code.js (rewrite), ui.html (markup + load 4 modules + minimal bootstrap), flowController.js, identityStore.js, indexEngine.js, telemetry.js. Delete: legacy handlers, __figdexLegacy*, NEW_FLOW_ENABLED, old bridges.
3. **Messaging** — code.js: single postMessage handler; UI -> code -> UI. ui.html: init(), DOM binds send intents only via postMessage; render(state, model); no direct indexing.
4. **Flow 1** — flowController: BOOT -> load identity -> READY_TO_SETUP if !connected. "Index selected pages" when !connected -> NEEDS_CONNECT (gate). Connect stubbed; state transitions correct.
5. **Test hooks** — UI_BOOT_SIGNATURE log; controller trace: prevState -> event -> nextState; code.js mockConnectedIdentity (dev only, no UI flag).

---

## FILE LIST

### CREATED
- `_archive/hard_reset_v1.31.00_<timestamp>/` — directory
- `_archive/hard_reset_v1.31.00_<timestamp>/README.md` — "Reference only — do not execute"
- (archive = copy of current plugin contents except node_modules/dist)

### MODIFIED (rewritten / stripped)
- `FigDex/plugin/code.js` — Rewrite clean: showUI, single onmessage, postMessage pipeline; mockConnectedIdentity; no legacy handlers.
- `FigDex/plugin/ui.html` — Keep markup + CSS; remove inline legacy script (~6200 lines); replace with: load 4 scripts, init(), render(state, model), DOM -> intents only (postMessage).
- `FigDex/plugin/flowController.js` — Rewrite: FSM BOOT|READY_TO_SETUP|NEEDS_CONNECT|READY_TO_INDEX|INDEXING|DONE|ERROR; dispatch(event); pendingAction; trace prevState->event->nextState.
- `FigDex/plugin/identityStore.js` — Rewrite: getIdentity, setIdentity, clearIdentity, isConnected (strict); no syncFromLegacy.
- `FigDex/plugin/indexEngine.js` — Rewrite: runIndexing(selectedPages, identity, callbacks); behavior preserved; no UI/identity reads.
- `FigDex/plugin/telemetry.js` — Rewrite: init, state_change, intent, needs_connect, connect_success, indexing_start, indexing_done, error.

### DELETED (from runtime; preserved in archive only)
- All inline legacy JS in ui.html (handlers, __figdexLegacy*, NEW_FLOW_ENABLED, adapters, encryption, ensureLocalIdentity, etc.).
- Old flowController/identityStore/indexEngine/telemetry behavior that relied on legacy.

### UNCHANGED (keep as-is)
- `manifest.json`
- `CHANGELOG.md`, `README.md`, `VERSIONS.md`, `readme.txt` (optional keep)

### NOT COPIED TO ARCHIVE
- node_modules, dist (if present)
