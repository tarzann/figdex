/**
 * FigDex plugin — code.js (hard reset).
 * Single postMessage pipeline: UI -> code -> UI.
 * No legacy handlers. mockConnectedIdentity for dev only (no UI flag).
 */
const PLUGIN_VERSION = '1.32.39';
const DEBUG_LOGS = false;
const PLUGIN_UI_HTML = "<!DOCTYPE html>\n<html>\n  <head>\n    <style>\n      body {\n        font-family: 'Inter', Arial, sans-serif;\n        background: #fff;\n        color: #222;\n        margin: 0;\n        padding: 0;\n        padding-bottom: 20px;\n        min-height: 100vh;\n        box-sizing: border-box;\n        width: 386px;\n        max-width: 386px;\n        min-width: 386px;\n        overflow-x: hidden;\n      }\n\n      /* Bottom Navigation Bar - REMOVED */\n\n      /* Tab Content */\n      .tab-content {\n        display: none;\n        padding: 0 16px 20px 16px;\n        padding-bottom: 20px;\n        width: 100%;\n        max-width: 100%;\n        box-sizing: border-box;\n        overflow-x: hidden;\n      }\n\n      .tab-content.active {\n        display: block;\n      }\n\n      /* Header */\n      .app-header {\n        padding: 12px 16px;\n        background: #fff;\n        border-bottom: 1px solid #e0e0e0;\n        position: sticky;\n        top: 0;\n        z-index: 10;\n        display: flex;\n        justify-content: space-between;\n        align-items: center;\n      }\n\n      .app-header .version {\n        font-size: 0.6em;\n        color: #888;\n      }\n      .debug-clear-btn {\n        font-size: 0.65em;\n        color: #888;\n        background: transparent;\n        border: 1px solid #e0e0e0;\n        border-radius: 4px;\n        padding: 2px 6px;\n        cursor: pointer;\n        transition: color 0.2s, border-color 0.2s;\n      }\n      .debug-clear-btn:hover {\n        color: #d32f2f;\n        border-color: #d32f2f;\n      }\n\n      .app-header .settings-icon-btn {\n        background: transparent;\n        border: none;\n        cursor: pointer;\n        font-size: 1em;\n        padding: 4px 8px;\n        color: #666;\n        transition: color 0.2s;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n      }\n\n      .app-header .settings-icon-btn:hover {\n        color: #1976d2;\n      }\n\n      .plugin-shell {\n        padding: 16px;\n        padding-bottom: 0;\n        box-sizing: border-box;\n      }\n\n      .hero-block {\n        margin: 0 0 12px 0;\n        width: 100%;\n        max-width: 100%;\n        min-width: 0;\n        box-sizing: border-box;\n      }\n\n      .hero-title {\n        font-size: 1.08em;\n        font-weight: 700;\n        color: #1f2937;\n        line-height: 1.2;\n        margin-bottom: 4px;\n        letter-spacing: -0.01em;\n      }\n\n      .hero-copy {\n        font-size: 0.74em;\n        color: #667085;\n        line-height: 1.45;\n      }\n\n      .section-card {\n        margin: 0 0 12px 0;\n        padding: 12px;\n        background: #fff;\n        border: 1px solid #e0e0e0;\n        border-radius: 10px;\n        width: 100%;\n        max-width: 100%;\n        min-width: 0;\n        box-sizing: border-box;\n      }\n\n      .section-card-muted {\n        background: #f8f9fa;\n      }\n\n      .section-header-row {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        gap: 8px;\n        margin-bottom: 6px;\n      }\n\n      .section-title {\n        font-size: 0.84em;\n        font-weight: 600;\n        color: #1976d2;\n        letter-spacing: -0.01em;\n      }\n\n      .section-copy {\n        font-size: 0.72em;\n        color: #666;\n        line-height: 1.45;\n        margin-bottom: 10px;\n      }\n\n      .pages-toolbar {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        gap: 10px;\n        margin-bottom: 8px;\n        flex-wrap: wrap;\n      }\n\n      .pages-summary {\n        display: flex;\n        gap: 6px;\n        flex-wrap: wrap;\n      }\n\n      .pages-summary-chip {\n        font-size: 0.64em;\n        color: #516071;\n        background: #fff;\n        border: 1px solid #e3e8ef;\n        border-radius: 999px;\n        padding: 3px 8px;\n      }\n\n      .pages-action-btn {\n        font-size: 0.64em;\n        color: #1976d2;\n        background: #fff;\n        border: 1px solid #d5deea;\n        border-radius: 999px;\n        padding: 2px 8px;\n        cursor: pointer;\n        line-height: 1.1;\n        white-space: nowrap;\n        transition: background 0.2s, border-color 0.2s, color 0.2s;\n      }\n\n      .pages-action-btn:hover {\n        background: #eef5ff;\n        border-color: #bfd6ff;\n      }\n\n      .pages-action-btn:disabled {\n        color: #98a2b3;\n        background: #f8fafc;\n        border-color: #e4e7ec;\n        cursor: not-allowed;\n      }\n\n      .usage-metric {\n        margin-bottom: 8px;\n      }\n\n      .usage-metric:last-child {\n        margin-bottom: 0;\n      }\n\n      .usage-label-row {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        gap: 8px;\n        margin-bottom: 4px;\n      }\n\n      .usage-label {\n        font-size: 0.7em;\n        font-weight: 600;\n        color: #334155;\n      }\n\n      .usage-value {\n        font-size: 0.68em;\n        color: #667085;\n      }\n\n      .usage-track {\n        width: 100%;\n        height: 6px;\n        border-radius: 999px;\n        background: #e7edf5;\n        overflow: hidden;\n      }\n\n      .usage-fill {\n        height: 100%;\n        width: 0%;\n        border-radius: 999px;\n        background: linear-gradient(90deg, #1976d2 0%, #4dabf7 100%);\n        transition: width 0.25s ease;\n      }\n\n      .usage-fill.warn {\n        background: linear-gradient(90deg, #ef6c00 0%, #ffb74d 100%);\n      }\n\n      .usage-fill.danger {\n        background: linear-gradient(90deg, #d32f2f 0%, #ef5350 100%);\n      }\n\n      #markNoIndexBtn, #markAllIndexBtn {\n        margin-top: 8px;\n        padding: 4px 0;\n        font-size: 0.95em;\n        background: #fff;\n        color: #1976d2;\n        border: 1px solid #e0e0e0;\n        border-radius: 6px;\n        cursor: pointer;\n        width: 260px;\n        margin-bottom: 8px;\n        font-weight: 500;\n        box-shadow: none;\n        transition: background 0.2s, color 0.2s;\n      }\n      #markNoIndexBtn:disabled, #markAllIndexBtn:disabled {\n        background: #f3f3f3;\n        color: #b0b0b0;\n        border-color: #e0e0e0;\n        cursor: not-allowed;\n      }\n      #markNoIndexBtn:hover:enabled, #markAllIndexBtn:hover:enabled {\n        background: #e3f2fd;\n      }\n      #markAllIndexBtn { color: #43a047; border-color: #43a047; }\n      #markAllIndexBtn:hover:enabled { background: #e8f5e9; }\n      #pagesList label {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        border-bottom: 1px solid #f0f0f0;\n        font-size: 1em;\n        padding: 4px 8px;\n      }\n      #pagesList label .page-row-left {\n        display: flex;\n        align-items: center;\n        flex: 1;\n        min-width: 0;\n      }\n      #pagesList label .page-row-icon {\n        flex-shrink: 0;\n        margin-left: 8px;\n        font-size: 0.55em;\n        color: #666;\n      }\n      #pagesList label.excluded-page {\n        opacity: 0.5;\n        background-color: #f9f9f9;\n      }\n      .excluded-warning-msg {\n        font-size: 0.7em;\n        color: #ff9800;\n        margin-left: 8px;\n        font-style: italic;\n        white-space: nowrap;\n        flex: 1;\n        min-width: 0;\n        overflow: hidden;\n        text-overflow: ellipsis;\n      }\n      #pagesList input[type=\"checkbox\"] {\n        margin-right: 8px;\n        accent-color: #2897FB;\n        width: 12px;\n        height: 12px;\n      }\n      .page-menu-btn {\n        background: none;\n        border: none;\n        cursor: pointer;\n        font-size: 1em;\n        color: #666;\n        padding: 2px 4px;\n        margin-left: 4px;\n        display: inline-flex;\n        align-items: center;\n        justify-content: center;\n        transition: color 0.2s;\n      }\n      .page-menu-btn:hover {\n        color: #1976d2;\n      }\n      .page-context-menu {\n        position: absolute;\n        background: white;\n        border: 1px solid #e0e0e0;\n        border-radius: 6px;\n        box-shadow: 0 2px 8px rgba(0,0,0,0.15);\n        z-index: 1000;\n        min-width: 160px;\n        padding: 4px 0;\n        font-size: 0.85em;\n      }\n      .page-context-menu-item {\n        padding: 8px 12px;\n        cursor: pointer;\n        color: #333;\n        transition: background 0.2s;\n      }\n      .page-context-menu-item:hover {\n        background: #f0f0f0;\n      }\n      .checkmark {\n        color: #43a047;\n        font-size: 1.1em;\n        vertical-align: middle;\n        margin-left: 6px;\n      }\n      .disabled-page {\n        color: #b0b0b0;\n        cursor: not-allowed;\n      }\n      #infoMsg{border:1px solid gray; padding:4px 16px 4px 16px; margin-bottom: 8px; text-align: center;border-radius: 4px;background: #f7f8fa; color: #222;width: fit-content;margin: 0 auto; margin-bottom: 8px;}\n      #overallProgressContainer { \n        width: 100%; \n        margin: 0 auto 12px auto; \n        display: none;\n      }\n      #overallProgressBarBg { \n        background: #eee; \n        border-radius: 8px; \n        height: 24px; \n        width: 100%; \n        position: relative;\n        margin-bottom: 8px;\n      }\n      #overallProgressBar { \n        background: linear-gradient(90deg, #1976d2 0%, #42a5f5 100%); \n        height: 100%; \n        width: 0%; \n        border-radius: 8px; \n        transition: width 0.3s ease;\n      }\n      #overallProgressText { \n        position: absolute; \n        left: 50%; \n        top: 50%;\n        transform: translate(-50%, -50%);\n        color: #1976d2; \n        font-weight: 600; \n        font-size: 0.85em; \n        width: 100%;\n        text-align: center;\n        white-space: nowrap;\n      }\n      #overallProgressDetails {\n        font-size: 0.75em;\n        color: #666;\n        text-align: center;\n        margin-top: 8px;\n      }\n      #doneMsg { color: #2897FB; margin-top: 16px; font-weight: 500; display: none; font-size: 1em; }\n      #errorMsg { color: #d32f2f; margin-top: 16px; font-weight: 500; display: none; font-size: 1em; }\n      #loading { display: none; }\n      #runningProgressBarContainer { display: none; }\n      .spinner {\n        border: 3px solid #eee;\n        border-top: 3px solid #2897FB;\n        border-radius: 50%;\n        width: 16px;\n        height: 16px;\n        animation: spin 1s linear infinite;\n        display: inline-block;\n        vertical-align: middle;\n        margin-left: 6px;\n      }\n      @keyframes spin {\n        0% { transform: rotate(0deg);}\n        100% { transform: rotate(360deg);}\n      }\n      @keyframes slideIn {\n        from { transform: translateY(-20px); opacity: 0; }\n        to { transform: translateY(0); opacity: 1; }\n      }\n      @keyframes slideOut {\n        from { transform: translateY(0); opacity: 1; }\n        to { transform: translateY(-20px); opacity: 0; }\n      }\n      /* refresh */\n      #refreshPagesBtn {\n        background: none;\n        border: none;\n        cursor: pointer;\n        font-size: 1.2em;\n        color: #2897FB;\n        padding: 0;\n        margin: 0;\n        display: inline-block;\n        line-height: 1;\n        vertical-align: middle;\n      }\n      #refreshPagesBtn:active { color: #0d99ff; }\n      #pagesCard {\n        width: 354px !important;\n        max-width: 354px !important;\n        min-width: 354px !important;\n        box-sizing: border-box !important;\n      }\n      #frameTagsSectionIndex {\n        width: 354px !important;\n        max-width: 354px !important;\n        min-width: 354px !important;\n        box-sizing: border-box !important;\n      }\n      #fileKeyRequiredMsg {\n        width: 100% !important;\n        max-width: 100% !important;\n        min-width: 0 !important;\n        box-sizing: border-box !important;\n      }\n      #marketingBoxCompact {\n        width: 354px !important;\n        max-width: 354px !important;\n        min-width: 354px !important;\n        box-sizing: border-box !important;\n      }\n      #indexSuccessScreen > div {\n        width: 354px !important;\n        max-width: 354px !important;\n        min-width: 354px !important;\n        box-sizing: border-box !important;\n      }\n      #pagesHeader { \n        display: flex; \n        align-items: center;\n        gap: 6px;\n        width: 100%; \n        border-bottom: 1px solid #0d99ff; \n        margin-bottom: 6px; \n        padding: 4px 0;\n      }\n      #pagesHeader > div:first-child {\n        flex: 1 1 auto;\n        min-width: 0;\n        display: flex;\n        align-items: center;\n      }\n      #pagesHeader > div:nth-child(2) {\n        flex: 0 0 auto;\n        display: flex;\n        align-items: center;\n        gap: 6px;\n      }\n      #pagesHeader > div:last-child {\n        flex: 0 0 auto;\n      }\n      \n      /* Animation for collapsible sections */\n      #pagesListContainer, #frameTagsContent {\n        transition: max-height 0.3s ease-out, opacity 0.3s ease-out, margin-bottom 0.3s ease-out;\n        overflow: hidden;\n      }\n      \n      #advanceBtn:hover:enabled {\n        background: #e3f2fd;\n      }\n      #advanceBtn:disabled {\n        background: #e0e0e0;\n        color: #9e9e9e;\n        border-color: #e0e0e0;\n        cursor: not-allowed;\n        opacity: 0.65;\n        pointer-events: none;\n      }\n      \n      /* Tag System Styles */\n      .tag {\n        display: inline-block;\n        background: #1976d2;\n        color: white;\n        padding: 2px 8px;\n        border-radius: 12px;\n        font-size: 0.7em;\n        margin: 2px;\n        cursor: pointer;\n        user-select: none;\n      }\n      \n      .tag:hover {\n        background: #1565c0;\n      }\n      \n      .tag-remove {\n        margin-left: 4px;\n        cursor: pointer;\n        font-weight: bold;\n      }\n      \n      .tag-input-container {\n        display: flex;\n        gap: 4px;\n        margin-bottom: 8px;\n      }\n      \n      .tag-input-field {\n        flex: 1;\n        padding: 4px 8px;\n        border: 1px solid #ddd;\n        border-radius: 4px;\n        font-size: 0.7em;\n      }\n      \n      .tag-add-btn {\n        background: #43a047;\n        color: white;\n        border: none;\n        padding: 4px 8px;\n        border-radius: 4px;\n        font-size: 0.7em;\n        cursor: pointer;\n      }\n      \n      .tag-add-btn:hover {\n        background: #388e3c;\n      }\n      \n      .frame-tags {\n        margin-top: 4px;\n        min-height: 20px;\n      }\n      \n      .tag-suggestions {\n        background: #f5f5f5;\n        border: 1px solid #ddd;\n        border-radius: 4px;\n        padding: 4px;\n        margin-top: 4px;\n        font-size: 0.7em;\n        max-height: 100px;\n        overflow-y: auto;\n      }\n      \n      .tag-suggestion {\n        padding: 2px 4px;\n        cursor: pointer;\n        border-radius: 2px;\n      }\n      \n      .tag-suggestion:hover {\n        background: #e0e0e0;\n      }\n      \n      /* Tag Button Styles */\n      .tag-btn {\n        background: #1976d2;\n        color: white;\n        border: none;\n        padding: 4px 12px;\n        border-radius: 12px;\n        font-size: 0.7em;\n        cursor: pointer;\n        transition: background 0.2s;\n      }\n      \n      .tag-btn:hover {\n        background: #1565c0;\n      }\n      \n      .tag-btn.active {\n        background: #43a047;\n      }\n      \n      /* Custom Slider Styles */\n      #qualitySlider {\n        -webkit-appearance: none;\n        appearance: none;\n        background: transparent;\n        cursor: pointer;\n        height: 20px;\n        width: 100%;\n        position: relative;\n        z-index: 2;\n      }\n      \n      #qualitySlider::-webkit-slider-thumb {\n        -webkit-appearance: none;\n        appearance: none;\n        width: 20px;\n        height: 20px;\n        background: #1976d2;\n        border-radius: 50%;\n        cursor: pointer;\n        box-shadow: 0 2px 6px rgba(25, 118, 210, 0.3);\n        border: 2px solid white;\n        transition: all 0.2s ease;\n        position: relative;\n      }\n      \n      #qualitySlider::-webkit-slider-thumb:hover {\n        transform: scale(1.1);\n        box-shadow: 0 4px 8px rgba(25, 118, 210, 0.4);\n      }\n      \n      #qualitySlider::-webkit-slider-track {\n        background: transparent;\n        height: 20px;\n        border-radius: 3px;\n        width: 100%;\n      }\n      \n      #qualitySlider::-moz-range-thumb {\n        width: 20px;\n        height: 20px;\n        background: #1976d2;\n        border-radius: 50%;\n        cursor: pointer;\n        border: 2px solid white;\n        box-shadow: 0 2px 6px rgba(25, 118, 210, 0.3);\n        transition: all 0.2s ease;\n      }\n      \n      #saveToWebBtn:disabled {\n        background: #d9d9d9 !important;\n        color: white !important;\n        cursor: not-allowed !important;\n        box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;\n        border: none !important;\n      }\n      \n      #addCustomTagBtn:hover {\n        background: #1565c0 !important;\n      }\n      \n      .tag-container:hover {\n        background: #bbdefb !important;\n      }\n      \n      .tag-delete-btn:hover {\n        color: #d32f2f !important;\n        background: rgba(244, 67, 54, 0.1) !important;\n        border-radius: 50% !important;\n      }\n      \n      #qualitySlider::-moz-range-track {\n        background: transparent;\n        height: 20px;\n        border: none;\n        border-radius: 3px;\n        width: 100%;\n      }\n      \n      /* Fixed width for quality label to prevent jumping */\n      #qualityLabel {\n        width: 130px !important;\n        min-width: 130px !important;\n        max-width: 130px !important;\n        text-align: right;\n        display: inline-block;\n        overflow: hidden;\n        white-space: nowrap;\n      }\n      \n      /* Tab Styles */\n      .tabButton {\n        transition: all 0.3s ease;\n        border-bottom: 3px solid transparent;\n      }\n      \n      .tabButton.active {\n        background: #1976d2 !important;\n        color: white !important;\n        border-bottom-color: #1565c0;\n      }\n      \n      .tabButton:not(.active) {\n        background: #f5f5f5 !important;\n        color: #666 !important;\n      }\n      \n      .tabButton:not(.active):hover {\n        background: #e0e0e0 !important;\n        color: #333 !important;\n      }\n      \n      .tabContent {\n        display: block;\n      }\n      \n      .tabContent.hidden {\n        display: none;\n      }\n      .settings-menu {\n        position: absolute;\n        right: 0;\n        top: 28px;\n        background: #fff;\n        border: 1px solid #e0e0e0;\n        border-radius: 8px;\n        box-shadow: 0 2px 10px rgba(0,0,0,0.08);\n        min-width: 220px;\n        z-index: 1000;\n        padding: 6px 0;\n        font-size: 0.8em;\n      }\n      .settings-menu.hidden { display: none; }\n      .settings-item {\n        display: flex;\n        align-items: center;\n        gap: 8px;\n        padding: 6px 10px;\n        cursor: pointer;\n        font-size: 0.8em;\n      }\n      .settings-item:hover { background: #f7f7f7; }\n      .settings-sep { height:1px; background:#eee; margin:6px 0; }\n      .quality-row { display:flex; align-items:center; gap:8px; width:100%; }\n      .quality-pills { display:flex; gap:6px; margin-left:auto; background:#fafafa; padding:4px; border:1px solid #eee; border-radius:6px; }\n      .quality-pill {\n        background:#fff; \n        border:1px solid #e0e0e0; \n        border-radius:12px; \n        padding:2px 8px; \n        font-size:0.8em; \n        cursor:pointer;\n        transition: all .15s ease;\n      }\n      .quality-pill:hover { background:#f7faff; border-color:#cfe3ff; }\n      .quality-pill.active { background:#1976d2; color:#fff; border-color:#1976d2; box-shadow:0 1px 4px rgba(25,118,210,.35); }\n      .step-disabled { opacity: 0.55; pointer-events: none; }\n      .step-complete { border-color: #e0e0e0 !important; background: #fff !important; }\n      .step-highlight { box-shadow: 0 0 0 2px rgba(25,118,210,.2); }\n      .page-row-action-disabled { opacity: 0.35; pointer-events: none; }\n    </style>\n  </head>\n  <body>\n    <!-- Header -->\n    <div class=\"app-header\">\n      <div style=\"display: flex; align-items: center; gap: 6px;\">\n        <div class=\"version\" id=\"pluginVersionLabel\">v1.32.35</div>\n        <button type=\"button\" id=\"debugClearStorageBtn\" class=\"debug-clear-btn\" title=\"Clear saved data (debug)\" onclick=\"typeof __figdexClearData === 'function' && __figdexClearData();\">Clear data</button>\n      </div>\n      <div style=\"flex: 1;\"></div>\n      <button id=\"settingsIconBtn\" class=\"settings-icon-btn\" title=\"Settings\">⚙️</button>\n    </div>\n\n    <div class=\"plugin-shell\">\n    <div class=\"hero-block\">\n      <div class=\"hero-title\">Index This File</div>\n      <div class=\"hero-copy\">Browse and search all its screens in FigDex Web.</div>\n    </div>\n\n    <div id=\"accountStatusCard\" class=\"section-card\">\n      <div class=\"section-header-row\">\n        <div class=\"section-title\">Account</div>\n        <span id=\"accountPlanBadge\" style=\"font-size:0.7em; background:#fff3e0; color:#8d6e63; padding:2px 8px; border-radius:999px; border:1px solid #ffe0b2;\">Guest</span>\n      </div>\n      <div id=\"accountIdentityLine\" style=\"font-size:0.8em; font-weight:600; color:#333; margin-bottom:4px;\">Guest mode</div>\n      <div id=\"accountStatusLine\" class=\"section-copy\">You can create your first index here and continue on the web later.</div>\n      <div id=\"accountUsageWrap\" style=\"display:none; margin-bottom:10px; padding:8px 10px; background:#f8f9fb; border:1px solid #e6e8ee; border-radius:8px;\">\n        <div class=\"usage-metric\">\n          <div class=\"usage-label-row\">\n            <div class=\"usage-label\">Files</div>\n            <div id=\"accountUsageFiles\" class=\"usage-value\">--</div>\n          </div>\n          <div class=\"usage-track\">\n            <div id=\"accountUsageFilesBar\" class=\"usage-fill\"></div>\n          </div>\n        </div>\n        <div class=\"usage-metric\">\n          <div class=\"usage-label-row\">\n            <div class=\"usage-label\">Frames</div>\n            <div id=\"accountUsageFrames\" class=\"usage-value\">--</div>\n          </div>\n          <div class=\"usage-track\">\n            <div id=\"accountUsageFramesBar\" class=\"usage-fill\"></div>\n          </div>\n        </div>\n      </div>\n      <button type=\"button\" id=\"accountPrimaryBtn\" style=\"font-size:0.78em; background:#1976d2; color:#fff; border:none; border-radius:8px; cursor:pointer; padding:9px 14px; font-weight:600; width:100%;\">Connect to FigDex</button>\n    </div>\n\n    <div id=\"currentFileStatusCard\" class=\"section-card\">\n      <div class=\"section-header-row\">\n        <div class=\"section-title\">Current File</div>\n        <span id=\"currentFileBadge\" style=\"font-size:0.7em; background:#f5f5f5; color:#666; padding:2px 8px; border-radius:999px; border:1px solid #e0e0e0;\">Link required</span>\n      </div>\n      <div id=\"currentFileStatusLine\" class=\"section-copy\">Paste the Figma file link to load pages and keep this file synced correctly.</div>\n      <div id=\"fileKeyRequiredMsg\" style=\"display:block; font-size:0.75em; color:#333;\">\n        <div id=\"fileKeyStep1Full\">\n          <div id=\"fileKeyInlineSection\" style=\"display:block;\">\n            <input id=\"fileKeyInlineInput\" type=\"text\" style=\"display:block; width:100%; max-width:100%; box-sizing:border-box; margin-bottom:6px; padding:6px 8px; font-size:0.75em; border:1px solid #e0e0e0; border-radius:4px; background:#fafbfc; color:#222;\" placeholder=\"Paste Figma file link\" />\n            <div style=\"font-size:0.65em; color:#888; margin-bottom:8px;\">Copy the full file link from your browser's address bar.</div>\n            <div style=\"display:flex; align-items:center; gap:8px; flex-wrap:wrap;\">\n              <button id=\"fileKeyInlineSaveBtn\" style=\"font-size:0.8em; background: #1976d2; color: #fff; border: 1px solid #1976d2; border-radius: 4px; cursor: pointer; width: auto; padding: 6px 12px; font-weight: 500; box-shadow: none; transition: background 0.2s, color 0.2s;\">Save & continue</button>\n              <span id=\"fileKeySetStatus\" style=\"font-size:0.8em; color:#43a047; min-width: 70px;\"></span>\n              <span id=\"fileKeyInlineStatus\" style=\"font-size:0.8em; color:#43a047;\"></span>\n            </div>\n          </div>\n        </div>\n        <div id=\"fileKeyStep1ChangeLink\" style=\"display: none; margin-top: 6px;\">\n          <button type=\"button\" id=\"fileKeyChangeLinkBtn\" style=\"font-size:0.75em; background:transparent; color:#1976d2; border:none; cursor:pointer; padding:0; text-decoration:underline;\">Change link</button>\n        </div>\n      </div>\n    </div>\n    \n    <!-- Marketing Banner for Disconnected Users (Large version - hidden by default, using header version instead) -->\n    <div id=\"marketingBannerTop\" style=\"display: none; margin: 0 0 10px 0; padding: 12px 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; box-shadow: 0 3px 12px rgba(102, 126, 234, 0.3); color: white; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; overflow: hidden; position: relative;\" onclick=\"openWebLogin()\">\n      <!-- Decorative circles -->\n      <div style=\"position: absolute; top: -20px; right: -20px; width: 80px; height: 80px; background: rgba(255,255,255,0.08); border-radius: 50%;\"></div>\n      <div style=\"position: absolute; bottom: -30px; left: -30px; width: 60px; height: 60px; background: rgba(255,255,255,0.05); border-radius: 50%;\"></div>\n      \n      <!-- Header row -->\n      <div style=\"display: flex; align-items: center; gap: 8px; margin-bottom: 8px; position: relative; z-index: 1;\">\n        <span style=\"font-size: 1.2em;\">🚀</span>\n        <span style=\"font-size: 0.85em; font-weight: 700;\">Connect to FigDex Web</span>\n        <span style=\"margin-left: auto; font-size: 0.7em; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 10px;\">Guest</span>\n      </div>\n      \n      <!-- Animated benefits carousel -->\n      <div id=\"benefitsCarousel\" style=\"height: 20px; overflow: hidden; position: relative; z-index: 1;\">\n        <div id=\"benefitsSlider\" style=\"display: flex; flex-direction: column; animation: slideUpBenefits 12s infinite;\">\n          <div style=\"height: 20px; display: flex; align-items: center; gap: 6px; font-size: 0.75em; opacity: 0.95;\">\n            <span>☁️</span> <span>Cloud storage & backup</span>\n          </div>\n          <div style=\"height: 20px; display: flex; align-items: center; gap: 6px; font-size: 0.75em; opacity: 0.95;\">\n            <span>👥</span> <span>Share with your team</span>\n          </div>\n          <div style=\"height: 20px; display: flex; align-items: center; gap: 6px; font-size: 0.75em; opacity: 0.95;\">\n            <span>🔍</span> <span>Advanced search & filters</span>\n          </div>\n          <div style=\"height: 20px; display: flex; align-items: center; gap: 6px; font-size: 0.75em; opacity: 0.95;\">\n            <span>🏷️</span> <span>Custom tags & organization</span>\n          </div>\n          <div style=\"height: 20px; display: flex; align-items: center; gap: 6px; font-size: 0.75em; opacity: 0.95;\">\n            <span>📱</span> <span>Access from any device</span>\n          </div>\n          <div style=\"height: 20px; display: flex; align-items: center; gap: 6px; font-size: 0.75em; opacity: 0.95;\">\n            <span>☁️</span> <span>Cloud storage & backup</span>\n          </div>\n        </div>\n      </div>\n      \n      <!-- CTA -->\n      <div style=\"margin-top: 10px; display: flex; align-items: center; gap: 8px; position: relative; z-index: 1;\">\n        <span style=\"font-size: 0.7em; background: rgba(255,255,255,0.95); color: #667eea; padding: 5px 12px; border-radius: 4px; font-weight: 600;\">Login / Register →</span>\n      </div>\n    </div>\n    \n    <style>\n      @keyframes slideUpBenefits {\n        0%, 16% { transform: translateY(0); }\n        20%, 36% { transform: translateY(-20px); }\n        40%, 56% { transform: translateY(-40px); }\n        60%, 76% { transform: translateY(-60px); }\n        80%, 96% { transform: translateY(-80px); }\n        100% { transform: translateY(-100px); }\n      }\n      #marketingBannerTop:hover {\n        transform: translateY(-2px);\n        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);\n      }\n    </style>\n    </div>\n\n    <!-- Tab Content: Index -->\n    <div id=\"tabIndex\" class=\"tab-content active\">\n\n      <!-- Marketing Box (Compact) - REMOVED, using marketingBannerTop instead -->\n\n      <!-- Pages Section -->\n      <div id=\"pagesCard\" class=\"section-card section-card-muted step-disabled\">\n        <div id=\"pagesCardHeader\" style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;\">\n          <div class=\"section-title\">Pages</div>\n          <button id=\"pagesCardToggleBtn\" style=\"background: transparent; border: none; cursor: pointer; font-size: 0.9em; color: #666; padding: 4px 8px; transition: color 0.2s; display: flex; align-items: center; flex-shrink: 0;\" title=\"Collapse/Expand\">\n            <span id=\"pagesCardToggleIcon\" style=\"display: inline-block; width: 12px; text-align: center;\">▼</span>\n          </button>\n        </div>\n        <div class=\"section-copy\" style=\"margin-bottom: 6px;\">Select pages to include in the index.</div>\n        <div id=\"selectedPagesCount\" style=\"font-size: 0.7em; color: #444; margin-bottom: 6px;\">0 pages selected</div>\n        <div class=\"pages-toolbar\">\n          <div id=\"pagesSummaryChips\" class=\"pages-summary\"></div>\n        </div>\n        \n        <!-- File Thumbnail -->\n        <div id=\"fileThumbnailContainer\" style=\"display: none; margin-bottom: 12px; text-align: center;\">\n          <img id=\"fileThumbnail\" src=\"\" alt=\"File thumbnail\" style=\"max-width: 40%; max-height: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);\" />\n        </div>\n\n        <div id=\"pagesLockedHint\" style=\"display:block; font-size:0.7em; color:#999; margin-bottom: 8px;\">Save the file link to continue.</div>\n        \n        <div id=\"pagesListContainer\">\n          <!-- Pages header: single row with flex -->\n          <div id=\"pagesHeader\">\n            <div>\n              <input type=\"checkbox\" id=\"toggleSelectCheckbox\" style=\"accent-color: #2897FB; width: 12px; height: 12px; margin-right: 8px; margin-left: 8px; vertical-align: middle;\">\n              <span style=\"font-size: 0.7em; display: inline-block; min-width: 0; flex: 1 1 auto;\">Page Name</span>\n            </div>\n            <div>\n              <button type=\"button\" id=\"selectAllPagesBtn\" class=\"pages-action-btn\">Select all</button>\n              <button type=\"button\" id=\"clearPagesBtn\" class=\"pages-action-btn\">Clear</button>\n            </div>\n            <div>\n              <button id=\"refreshPagesBtn\" title=\"Refresh pages\">&#x21bb;</button>\n            </div>\n          </div>\n          <div id=\"pagesList\" style=\"max-height: 300px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 8px;\"></div>\n          <div id=\"pageListHelperText\" style=\"display: none; font-size: 0.7em; color: #666; margin-top: 6px; margin-bottom: 4px;\"></div>\n          <div id=\"openGalleryFromPagesWrap\" style=\"display: none; margin-top: 8px; text-align: center;\">\n            <button type=\"button\" id=\"openGalleryFromPagesBtn\" style=\"font-size:0.75em; background: transparent; color: #1976d2; border: 1px solid #1976d2; border-radius: 6px; cursor: pointer; padding: 6px 12px;\">Open FigDex Web</button>\n          </div>\n        </div>\n        \n        <!-- NEEDS_CONNECT: connect to create index -->\n        <div id=\"needsConnectBlock\" style=\"display: none; text-align: center; margin-top: 8px; padding: 12px; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px;\">\n          <div id=\"needsConnectMessage\" style=\"font-size:0.8em; color:#333; margin-bottom:10px;\">Connect your FigDex account to create an index.</div>\n          <button type=\"button\" id=\"openFigdexWebBtn\" style=\"font-size:0.8em; background: #1976d2; color: white; border: none; border-radius: 6px; cursor: pointer; padding: 10px 16px; font-weight: 500;\">Open FigDex Web</button>\n        </div>\n        <!-- CONNECT_TIMEOUT: try again or cancel -->\n        <div id=\"connectTimeoutBlock\" style=\"display: none; text-align: center; margin-top: 8px; padding: 12px; background: #fff3e0; border: 1px solid #ffcc80; border-radius: 8px;\">\n          <div style=\"font-size:0.8em; color:#333; margin-bottom:10px;\">Connection timed out.</div>\n          <div style=\"display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;\">\n            <button type=\"button\" id=\"connectTimeoutRetryBtn\" style=\"font-size:0.8em; background: #1976d2; color: white; border: none; border-radius: 6px; cursor: pointer; padding: 8px 14px; font-weight: 500;\">Try again</button>\n            <button type=\"button\" id=\"connectTimeoutCancelBtn\" style=\"font-size:0.8em; background: transparent; color: #666; border: 1px solid #ccc; border-radius: 6px; cursor: pointer; padding: 8px 14px;\">Cancel</button>\n          </div>\n        </div>\n        <!-- Create Index Button -->\n        <div id=\"actionCard\" class=\"section-card\" style=\"display:block; text-align: center; margin-top: 8px;\">\n          <div class=\"section-header-row\" style=\"justify-content:center; margin-bottom:4px;\">\n            <div class=\"section-title\" style=\"color:#1f2937;\">Action</div>\n          </div>\n          <div id=\"actionStatusTitle\" style=\"font-size:0.82em; font-weight:600; color:#333; margin-bottom:4px;\">Ready to create index</div>\n          <div id=\"indexOutcomeHint\" class=\"section-copy\" style=\"margin-bottom:6px;\">This will create a visual gallery of all selected screens in FigDex Web.</div>\n          <div id=\"indexErrorBlock\" style=\"display: none; margin-bottom: 10px; padding: 10px; background: #fafafa; border: 1px solid #e0e0e0; border-radius: 6px; text-align: center;\">\n            <div id=\"indexErrorText\" style=\"font-size: 0.75em; color: #555; margin-bottom: 8px;\"></div>\n            <button type=\"button\" id=\"indexErrorActionBtn\" style=\"font-size: 0.8em; background: #1976d2; color: white; border: none; border-radius: 6px; cursor: pointer; padding: 8px 14px; font-weight: 500;\">Try again</button>\n          </div>\n          <div id=\"actionCardButtonsWrap\" style=\"display: flex; gap: 8px; align-items: center;\">\n            <button id=\"advanceBtn\" type=\"button\" disabled style=\"font-size: 0.8em; background: #1976d2; color: white; border: none; border-radius: 6px; cursor: pointer; flex: 1; padding: 10px 16px; font-weight: 500; box-shadow: 0 2px 4px rgba(25, 118, 210, 0.3); transition: background 0.2s, box-shadow 0.2s;\">Index selected pages</button>\n          </div>\n        </div>\n        <!-- INDEXING: simple overlay -->\n        <div id=\"indexingBlock\" style=\"display: none; text-align: left; margin-top: 8px; padding: 14px; background: linear-gradient(180deg, #f8fbff 0%, #f4f8fd 100%); border: 1px solid #d7e6fb; border-radius: 10px;\">\n          <div style=\"display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px;\">\n            <div style=\"display:flex; align-items:center; gap:10px; min-width:0;\">\n              <span class=\"spinner\" style=\"margin-left:0; width:18px; height:18px; border-width:3px; flex:0 0 auto;\"></span>\n              <div id=\"indexingBlockStage\" style=\"font-size: 0.68em; color: #1976d2; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;\">Working</div>\n            </div>\n            <div style=\"font-size:0.68em; color:#5b6b7f; background:#fff; border:1px solid #d7e6fb; border-radius:999px; padding:3px 8px;\">Live status</div>\n          </div>\n          <div id=\"indexingBlockText\" style=\"font-size: 0.92em; color: #1f2937; font-weight: 600; line-height:1.35;\">Updating index…</div>\n          <div id=\"indexingBlockSubtext\" style=\"font-size: 0.76em; color: #667085; margin-top: 6px; line-height:1.45;\">Your existing gallery is being updated with the selected pages.</div>\n          <div id=\"indexingBlockProgressWrap\" style=\"display:none; margin-top:12px;\">\n            <div style=\"display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:6px;\">\n              <div id=\"indexingBlockProgressMeta\" style=\"font-size:0.72em; color:#516071;\">Elapsed 0s</div>\n              <div id=\"indexingBlockProgressPct\" style=\"font-size:0.78em; color:#1976d2; font-weight:700;\">0%</div>\n            </div>\n            <div style=\"width:100%; height:10px; border-radius:999px; background:#e7edf5; overflow:hidden;\">\n              <div id=\"indexingBlockProgressBar\" style=\"width:0%; height:100%; border-radius:999px; background:linear-gradient(90deg, #1976d2 0%, #4dabf7 100%); transition:width 0.25s ease;\"></div>\n            </div>\n          </div>\n          <div id=\"indexingBlockHint\" style=\"display:none; font-size:0.72em; color:#8d6e63; margin-top:10px;\">This is taking longer than usual. Large or very long frames may need extra time.</div>\n        </div>\n        <!-- DONE: simple section + View in FigDex Web -->\n        <div id=\"doneBlock\" style=\"display: none; text-align: center; margin-top: 8px; padding: 16px; background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 8px;\">\n          <div id=\"doneBlockTitle\" style=\"font-size: 0.9em; color: #4caf50; font-weight: 500; margin-bottom: 4px;\">Index updated successfully</div>\n          <div id=\"doneBlockSubtitle\" style=\"font-size: 0.75em; color: #666; margin-bottom: 10px;\">Your gallery has been updated.</div>\n          <button type=\"button\" id=\"doneOpenWebBtn\" style=\"font-size: 0.8em; background: #1976d2; color: white; border: none; border-radius: 6px; cursor: pointer; padding: 10px 16px; font-weight: 500;\">View in FigDex Web</button>\n          <div style=\"margin-top: 10px;\">\n            <button type=\"button\" id=\"doneUpdateAgainBtn\" style=\"font-size: 0.75em; background: transparent; color: #666; border: none; cursor: pointer; padding: 6px 0; text-decoration: underline; transition: color 0.2s;\">Update index again</button>\n          </div>\n        </div>\n      </div>\n\n      <!-- Frame Tags Section - Simple and Clean -->\n      <div id=\"frameTagsSectionIndex\" style=\"display:none; margin-bottom: 12px; padding: 10px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;\">\n        <div id=\"frameTagsHeader\" style=\"display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;\">\n          <div style=\"font-size: 0.8em; font-weight: 600; color: #1976d2;\">Frame Tags (optional)</div>\n          <button id=\"frameTagsToggleBtn\" style=\"background: transparent; border: none; cursor: pointer; font-size: 0.9em; color: #666; padding: 4px 8px; transition: color 0.2s; display: flex; align-items: center; flex-shrink: 0;\" title=\"Collapse/Expand\">\n            <span id=\"frameTagsToggleIcon\" style=\"display: inline-block; width: 12px; text-align: center;\">▶</span>\n          </button>\n        </div>\n        \n        <!-- Locked State (Not Connected) -->\n        <div id=\"frameTagsLocked\" style=\"display: none;\">\n          <div style=\"font-size: 0.75em; color: #666; padding: 8px; background: #fff; border-radius: 4px; border: 1px solid #e0e0e0;\">\n            <div style=\"display: flex; align-items: center; gap: 8px; margin-bottom: 6px;\">\n              <span style=\"font-size: 1.2em;\">🔒</span>\n              <span style=\"font-weight: 500; color: #333;\">Available after connecting to FigDex Web.</span>\n            </div>\n            <div style=\"font-size: 0.7em; color: #666; margin-left: 28px;\">Connect to FigDex Web to add tags to your frames.</div>\n          </div>\n        </div>\n        \n        <div id=\"frameTagsContent\" style=\"display: none;\">\n          <div style=\"font-size: 0.7em; color: #666; margin-bottom: 8px;\">Add tags to selected frames for better organization</div>\n          \n          <!-- Selected Frames Info -->\n          <div id=\"selectedFramesInfoIndex\" style=\"font-size: 0.7em; color: #666; margin-bottom: 8px;\">No frames selected</div>\n          \n          <!-- Predefined Tags -->\n          <div style=\"margin-bottom: 8px;\">\n            <div style=\"font-size: 0.7em; font-weight: 500; margin-bottom: 4px; color: #333;\">Quick Tags:</div>\n            <div id=\"predefinedTagsIndex\" style=\"display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;\">\n              <button class=\"frame-tag-btn\" data-tag=\"No-Index\" style=\"font-size: 0.7em; background: #fff; color: #1976d2; border: 1px solid #e0e0e0; border-radius: 4px; padding: 4px 8px; cursor: pointer;\">No-Index</button>\n              <button class=\"frame-tag-btn\" data-tag=\"Mobile\" style=\"font-size: 0.7em; background: #fff; color: #1976d2; border: 1px solid #e0e0e0; border-radius: 4px; padding: 4px 8px; cursor: pointer;\">Mobile</button>\n              <button class=\"frame-tag-btn\" data-tag=\"Desktop\" style=\"font-size: 0.7em; background: #fff; color: #1976d2; border: 1px solid #e0e0e0; border-radius: 4px; padding: 4px 8px; cursor: pointer;\">Desktop</button>\n              <button class=\"frame-tag-btn\" data-tag=\"iOS\" style=\"font-size: 0.7em; background: #fff; color: #1976d2; border: 1px solid #e0e0e0; border-radius: 4px; padding: 4px 8px; cursor: pointer;\">iOS</button>\n              <button class=\"frame-tag-btn\" data-tag=\"Android\" style=\"font-size: 0.7em; background: #fff; color: #1976d2; border: 1px solid #e0e0e0; border-radius: 4px; padding: 4px 8px; cursor: pointer;\">Android</button>\n              <button class=\"frame-tag-btn\" data-tag=\"Web\" style=\"font-size: 0.7em; background: #fff; color: #1976d2; border: 1px solid #e0e0e0; border-radius: 4px; padding: 4px 8px; cursor: pointer;\">Web</button>\n            </div>\n          </div>\n          \n          <!-- Current Tags -->\n          <div style=\"margin-bottom: 8px;\">\n            <div style=\"font-size: 0.7em; font-weight: 500; margin-bottom: 4px; color: #333;\">Current Tags:</div>\n            <div id=\"currentTagsIndex\" style=\"font-size: 0.7em; color: #666; min-height: 24px;\">No tags added yet</div>\n          </div>\n          \n          <!-- Custom Tag Input -->\n          <div style=\"margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;\">\n            <div style=\"display: flex; gap: 6px;\">\n              <input type=\"text\" id=\"customTagInputIndexNew\" placeholder=\"Enter custom tag...\" style=\"flex: 1; padding: 6px 8px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 0.7em; box-sizing: border-box;\">\n              <button id=\"addCustomTagBtnIndexNew\" style=\"font-size: 0.7em; background: #1976d2; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-weight: 500;\">Add</button>\n            </div>\n          </div>\n          \n          <!-- Action Buttons -->\n          <div style=\"margin-top: 12px; padding-top: 12px; border-top: 1px solid #e0e0e0; display: flex; gap: 8px;\">\n            <button id=\"reindexWithTagsBtn\" style=\"flex: 1; font-size: 0.75em; background: #1976d2; color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-weight: 500;\">Re-index</button>\n            <button id=\"saveToWebBtnTags\" style=\"flex: 1; font-size: 0.75em; background: #4caf50; color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-weight: 500;\">Save to FigDex Web</button>\n          </div>\n        </div>\n      </div>\n\n      <!-- Success Screen after Index Creation (removed - now using drawer) -->\n      </div>\n      \n      <!-- Overlay and Drawer for Settings -->\n      <div id=\"settingsOverlay\" style=\"display:none; position:fixed; left:0; top:0; width:100vw; height:100vh; background:rgba(30,30,40,0.45); z-index:1000; transition: opacity 0.3s ease;\"></div>\n      <div id=\"settingsDrawer\" style=\"display:none; position:fixed; left:0; bottom:0; width:100%; max-height:80vh; background:#fff; box-shadow:0 -4px 24px rgba(0,0,0,0.2); z-index:1001; border-radius:16px 16px 0 0; overflow-y:auto; transform:translateY(100%); transition:transform 0.3s ease-out;\" onclick=\"event.stopPropagation();\">\n        <div style=\"position:relative; padding:20px; max-width:386px; margin:0 auto;\">\n          <!-- Close Button -->\n          <button id=\"closeSettingsDrawerBtn\" style=\"position:absolute; top:16px; right:16px; background:transparent; border:none; font-size:1.5em; color:#666; cursor:pointer; padding:0; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; transition:background 0.2s;\" onmouseover=\"this.style.background='#f0f0f0';\" onmouseout=\"this.style.background='transparent';\" title=\"Close\">×</button>\n          \n          <!-- Drawer Handle -->\n          <div style=\"width:40px; height:4px; background:#ddd; border-radius:2px; margin:0 auto 16px auto;\"></div>\n          \n          <!-- Settings Content -->\n          <div id=\"settingsDrawerContent\" style=\"margin-top: 8px;\">\n            <div style=\"margin-top: 24px;\">\n              <div style=\"font-size: 0.9em; font-weight: 600; margin-bottom: 16px; color: #1976d2;\">Settings</div>\n              \n              <!-- Connect to FigDex Web -->\n              <div style=\"padding: 12px; background: #fff; border-radius: 6px; margin-bottom: 12px; border: 1px solid #e0e0e0;\">\n                <div style=\"font-size: 0.9em; font-weight: 600; margin-bottom: 8px; color: #1976d2;\">Connect to FigDex Web</div>\n                \n                <!-- Connected Status (shown when connected) -->\n                <div id=\"connectedAsSettings\" style=\"display:none; margin-bottom: 8px; font-size: 0.8em; color: #2e7d32;\">\n                  Connected as: <span id=\"connectedAsEmailSettings\" style=\"font-weight:600;\"></span>\n                </div>\n                \n                <!-- Login/Register Section (shown when not connected) -->\n                <div id=\"webConnectionSectionSettings\" style=\"margin-bottom: 8px;\">\n                  <button id=\"loginWebBtnSettings\" style=\"font-size: 0.8em; background: #1976d2; color: white; border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer; font-weight: 500; width: 100%; margin-bottom: 8px;\">Login / Register with Google</button>\n                  \n                  <!-- API Key Section -->\n                  <div id=\"apiKeySectionSettings\" style=\"margin-top: 8px;\">\n                    <div style=\"font-size: 0.75em; font-weight: 500; margin-bottom: 6px; color: #333;\">Enter your API Key</div>\n                    <input type=\"password\" id=\"apiKeyInputSettings\" placeholder=\"Enter your API key\" style=\"width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.75em; box-sizing: border-box; margin-bottom: 6px;\">\n                    <button id=\"saveApiKeyBtnSettings\" style=\"font-size: 0.75em; background: #4caf50; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; width: 100%;\">Save API Key</button>\n                  </div>\n                </div>\n                \n              </div>\n              \n              <!-- Image Quality -->\n              <div style=\"padding: 12px; background: #fff; border-radius: 6px; margin-bottom: 12px; border: 1px solid #e0e0e0;\">\n                <div class=\"quality-row\" style=\"display: flex; align-items: center; gap: 8px; width: 100%;\">\n                  <span style=\"font-size: 1.2em;\">🖼️</span>\n                  <span style=\"font-size: 0.9em; font-weight: 500; flex: 1;\">Image quality</span>\n                  <div class=\"quality-pills\" style=\"display: flex; gap: 6px; background: #fafafa; padding: 4px; border: 1px solid #eee; border-radius: 6px;\">\n                    <button class=\"qualityQuickBtn quality-pill\" data-q=\"40\" style=\"background: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8em; font-weight: 500; transition: background 0.2s;\">low</button>\n                    <button class=\"qualityQuickBtn quality-pill\" data-q=\"70\" style=\"background: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8em; font-weight: 500; transition: background 0.2s;\">med</button>\n                    <button class=\"qualityQuickBtn quality-pill\" data-q=\"100\" style=\"background: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8em; font-weight: 500; transition: background 0.2s;\">hi</button>\n                  </div>\n                </div>\n              </div>\n              \n              <!-- Clear local index (when server data was deleted) -->\n              <div id=\"clearLocalIndexCard\" style=\"padding: 12px; background: #fff; border-radius: 6px; margin-bottom: 12px; border: 1px solid #e0e0e0; cursor: pointer; transition: background 0.2s;\" onmouseover=\"this.style.background='#f5f5f5';\" onmouseout=\"this.style.background='#fff';\" onclick=\"if(typeof sendIntent==='function')sendIntent('clear-indexed-pages');if(typeof __figdexCloseSettingsDrawer==='function')__figdexCloseSettingsDrawer();\">\n                <div style=\"display: flex; align-items: center; gap: 8px;\">\n                  <span style=\"font-size: 1.2em;\">🔄</span>\n                  <div>\n                    <span style=\"font-size: 0.85em; font-weight: 500; color: #333;\">Clear local index</span>\n                    <div style=\"font-size: 0.7em; color: #666; margin-top: 2px;\">Use when you deleted server data and pages still show as indexed</div>\n                  </div>\n                </div>\n              </div>\n              \n              <!-- Additional Settings (shown only when connected) -->\n              <div id=\"additionalSettingsSection\" style=\"display:none;\">\n                <div style=\"font-size: 0.9em; font-weight: 600; margin-bottom: 12px; color: #1976d2; margin-top: 8px;\">Account Settings</div>\n                \n                <!-- My Account Card -->\n                <div id=\"myAccountCard\" style=\"padding: 12px; background: #fff; border-radius: 6px; margin-bottom: 12px; border: 1px solid #e0e0e0; cursor: pointer; transition: background 0.2s;\" onmouseover=\"this.style.background='#f5f5f5';\" onmouseout=\"this.style.background='#fff';\" onclick=\"openMyAccount()\">\n                  <div style=\"display: flex; align-items: center; justify-content: space-between;\">\n                    <div style=\"display: flex; align-items: center; gap: 8px;\">\n                      <span style=\"font-size: 1.2em;\">👤</span>\n                      <span style=\"font-size: 0.85em; font-weight: 500; color: #333;\">My Account</span>\n                    </div>\n                    <span style=\"font-size: 0.8em; color: #666;\">→</span>\n                  </div>\n                  <div id=\"myAccountContent\" style=\"margin-top: 8px; font-size: 0.75em; color: #666;\">\n                    Loading account information...\n                  </div>\n                </div>\n                \n                <!-- Index Management Card -->\n                <div id=\"indexManagementCard\" style=\"padding: 12px; background: #fff; border-radius: 6px; margin-bottom: 12px; border: 1px solid #e0e0e0; cursor: pointer; transition: background 0.2s;\" onmouseover=\"this.style.background='#f5f5f5';\" onmouseout=\"this.style.background='#fff';\" onclick=\"openIndexManagement()\">\n                  <div style=\"display: flex; align-items: center; justify-content: space-between;\">\n                    <div style=\"display: flex; align-items: center; gap: 8px;\">\n                      <span style=\"font-size: 1.2em;\">📑</span>\n                      <span style=\"font-size: 0.85em; font-weight: 500; color: #333;\">Index Management</span>\n                    </div>\n                    <span style=\"font-size: 0.8em; color: #666;\">→</span>\n                  </div>\n                  <div id=\"indexManagementContent\" style=\"margin-top: 8px; font-size: 0.75em; color: #666;\">\n                    Loading index information...\n                  </div>\n                </div>\n                \n                <!-- API Integration Card -->\n                <div id=\"apiIntegrationCard\" style=\"padding: 12px; background: #fff; border-radius: 6px; margin-bottom: 12px; border: 1px solid #e0e0e0; cursor: pointer; transition: background 0.2s;\" onmouseover=\"this.style.background='#f5f5f5';\" onmouseout=\"this.style.background='#fff';\" onclick=\"openApiIntegration()\">\n                  <div style=\"display: flex; align-items: center; justify-content: space-between;\">\n                    <div style=\"display: flex; align-items: center; gap: 8px;\">\n                      <span style=\"font-size: 1.2em;\">🔑</span>\n                      <span style=\"font-size: 0.85em; font-weight: 500; color: #333;\">API Integration</span>\n                    </div>\n                    <span style=\"font-size: 0.8em; color: #666;\">→</span>\n                  </div>\n                  <div id=\"apiIntegrationContent\" style=\"margin-top: 8px; font-size: 0.75em; color: #666;\">\n                    View and manage your API keys\n                  </div>\n                </div>\n              </div>\n              \n              <!-- Plugin Version -->\n              <div style=\"padding: 8px 12px; text-align: center; color: #888;\">\n                <span style=\"font-size: 0.7em;\">Plugin version: <span class=\"menuVersionText\">v1.32.35</span></span>\n              </div>\n\n              <!-- Debug: Clear Local Data -->\n              <div style=\"padding: 12px; background: #fff; border-radius: 6px; margin-bottom: 12px; border: 1px solid #e0e0e0;\">\n                <div style=\"font-size: 0.85em; font-weight: 500; margin-bottom: 6px; color: #333;\">Debug</div>\n                <button id=\"debugClearDataBtn\" style=\"font-size: 0.8em; background: #fff3f3; color: #d32f2f; border: 1px solid #f5c2c7; border-radius: 4px; padding: 8px 16px; cursor: pointer; font-weight: 500; width: 100%;\">Clear Local Data</button>\n                <div style=\"font-size: 0.7em; color: #666; margin-top: 6px;\">Clears file key, pages, tags, and cached tokens.</div>\n              </div>\n              \n              <!-- Disconnect Button (shown when connected) -->\n              <div id=\"disconnectBtnSettings\" style=\"display:none; padding: 12px; background: #fff; border-radius: 6px; margin-bottom: 12px; border: 1px solid #e0e0e0;\">\n                <button id=\"disconnectWebBtnSettings\" style=\"font-size: 0.8em; background: #d32f2f; color: white; border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer; font-weight: 500; width: 100%;\">Disconnect</button>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n        \n    <!-- Tab Content: Settings (hidden, content moved to drawer) -->\n    <div id=\"tabSettings\" class=\"tab-content\" style=\"display:none;\">\n      <div style=\"padding: 10px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0; margin-bottom: 12px; width: 354px !important; max-width: 354px !important; min-width: 354px !important; box-sizing: border-box;\">\n        <div style=\"display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;\">\n          <div style=\"font-size: 0.8em; font-weight: 600; color: #1976d2;\">Settings</div>\n          <button id=\"backToIndexBtn\" style=\"background: transparent; border: none; color: #1976d2; cursor: pointer; font-size: 0.8em; padding: 4px 8px; text-decoration: underline;\">← Back</button>\n        </div>\n        \n        <!-- Connect to FigDex Web -->\n        <div style=\"padding: 12px; background: #fff; border-radius: 6px; margin-bottom: 12px; border: 1px solid #e0e0e0;\">\n          <div style=\"font-size: 0.9em; font-weight: 600; margin-bottom: 8px; color: #1976d2;\">Connect to FigDex Web</div>\n          \n          <!-- Connected Status (shown when connected) -->\n          <div id=\"connectedAsSettings\" style=\"display:none; margin-bottom: 8px; font-size: 0.8em; color: #2e7d32;\">\n            Connected as: <span id=\"connectedAsEmailSettings\" style=\"font-weight:600;\"></span>\n          </div>\n          \n          <!-- Login Button (shown when not connected) -->\n          <div id=\"webConnectionSectionSettings\" style=\"margin-bottom: 8px;\">\n            <button id=\"loginWebBtnSettings\" style=\"font-size: 0.8em; background: #1976d2; color: white; border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer; font-weight: 500; width: 100%; margin-bottom: 8px;\">Login / Register to FigDex Web</button>\n            \n            <!-- API Key Section -->\n            <div id=\"apiKeySectionSettings\" style=\"margin-top: 8px;\">\n              <div style=\"font-size: 0.75em; font-weight: 500; margin-bottom: 6px; color: #333;\">Enter your API Key</div>\n              <input type=\"password\" id=\"apiKeyInputSettings\" placeholder=\"Enter your API key\" style=\"width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.75em; box-sizing: border-box; margin-bottom: 6px;\">\n              <button id=\"saveApiKeyBtnSettings\" style=\"font-size: 0.75em; background: #4caf50; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; width: 100%;\">Save API Key</button>\n            </div>\n          </div>\n          \n        </div>\n        \n        <!-- Image Quality -->\n        <div style=\"padding: 12px; background: #fff; border-radius: 6px; margin-bottom: 12px; border: 1px solid #e0e0e0;\">\n          <div class=\"quality-row\" style=\"display: flex; align-items: center; gap: 8px; width: 100%;\">\n            <span style=\"font-size: 1.2em;\">🖼️</span>\n            <span style=\"font-size: 0.9em; font-weight: 500; flex: 1;\">Image quality</span>\n            <div class=\"quality-pills\" style=\"display: flex; gap: 6px; background: #fafafa; padding: 4px; border: 1px solid #eee; border-radius: 6px;\">\n              <button class=\"qualityQuickBtn quality-pill\" data-q=\"40\" style=\"background: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8em; font-weight: 500; transition: background 0.2s;\">low</button>\n              <button class=\"qualityQuickBtn quality-pill\" data-q=\"70\" style=\"background: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8em; font-weight: 500; transition: background 0.2s;\">med</button>\n              <button class=\"qualityQuickBtn quality-pill\" data-q=\"100\" style=\"background: #fff; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8em; font-weight: 500; transition: background 0.2s;\">hi</button>\n            </div>\n          </div>\n        </div>\n        \n        <!-- Plugin Version -->\n        <div style=\"padding: 8px 12px; text-align: center; color: #888;\">\n          <span style=\"font-size: 0.7em;\">Plugin version: <span class=\"menuVersionText\">v1.32.35</span></span>\n        </div>\n        \n        <!-- Disconnect Button (shown when connected) -->\n        <div id=\"disconnectBtnSettings\" style=\"display:none; padding: 12px; background: #fff; border-radius: 6px; margin-bottom: 12px; border: 1px solid #e0e0e0;\">\n          <button id=\"disconnectWebBtnSettings\" style=\"font-size: 0.8em; background: #d32f2f; color: white; border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer; font-weight: 500; width: 100%;\">Disconnect</button>\n        </div>\n      </div>\n    </div>\n\n    <!-- Tab Content: Web -->\n    <div id=\"tabWeb\" class=\"tab-content\">\n      <!-- Web Connection Drawer -->\n      <div id=\"webDrawerTab\" style=\"display: block; background: transparent; border: none; border-radius: 0; box-shadow: none; margin: 0; overflow: visible;\">\n        <div style=\"padding: 0;\">\n          \n          <!-- Marketing Box -->\n          <div id=\"marketingBoxTab\" style=\"margin-bottom: 16px; padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); color: white; position: relative; overflow: hidden;\">\n            <!-- Decorative background elements -->\n            <div style=\"position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: rgba(255, 255, 255, 0.1); border-radius: 50%;\"></div>\n            <div style=\"position: absolute; bottom: -30px; left: -30px; width: 80px; height: 80px; background: rgba(255, 255, 255, 0.08); border-radius: 50%;\"></div>\n            \n            <!-- Content -->\n            <div style=\"position: relative; z-index: 1;\">\n              <div style=\"font-size: 1.1em; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;\">\n                <span style=\"font-size: 1.3em;\">🚀</span>\n                <span>Unlock the Full Power of FigDex</span>\n              </div>\n              <div style=\"font-size: 0.85em; line-height: 1.6; margin-bottom: 12px; opacity: 0.95;\">\n                Connect to FigDex Web and transform your workflow with cloud storage, team collaboration, and advanced search capabilities.\n              </div>\n              <div style=\"display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px;\">\n                <div style=\"display: flex; align-items: center; gap: 8px; font-size: 0.8em;\">\n                  <span style=\"font-size: 1.1em;\">☁️</span>\n                  <span>Cloud Storage - Access your indices anywhere</span>\n                </div>\n                <div style=\"display: flex; align-items: center; gap: 8px; font-size: 0.8em;\">\n                  <span style=\"font-size: 1.1em;\">👥</span>\n                  <span>Team Sharing - Collaborate seamlessly</span>\n                </div>\n                <div style=\"display: flex; align-items: center; gap: 8px; font-size: 0.8em;\">\n                  <span style=\"font-size: 1.1em;\">🔍</span>\n                  <span>Advanced Search - Find frames instantly</span>\n                </div>\n                <div style=\"display: flex; align-items: center; gap: 8px; font-size: 0.8em;\">\n                  <span style=\"font-size: 1.1em;\">🏷️</span>\n                  <span>Smart Tagging - Organize with tags</span>\n                </div>\n              </div>\n              <div style=\"font-size: 0.75em; opacity: 0.9; font-style: italic; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.2);\">\n                Join thousands of designers already using FigDex Web\n              </div>\n            </div>\n          </div>\n          \n          <!-- Web Connection Section (when not connected) -->\n          <div id=\"webConnectionSectionTab\" style=\"margin-bottom: 18px; padding: 10px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;\">\n            <div style=\"font-size: 0.8em; font-weight: 600; margin-bottom: 6px; color: #1976d2;\">Web Connection</div>\n            <div id=\"webLoginStatusTab\" style=\"font-size: 0.8em; color: #666; margin-bottom: 12px;\">\n              <div style=\"font-weight: 600; margin-bottom: 8px; color: #1976d2; font-size: 0.85em;\">Why connect to FigDex Web?</div>\n              <div style=\"font-size: 0.78em; line-height: 1.5;\">\n                • <strong>Cloud Storage:</strong> Save your indices online<br>\n                • <strong>Team Sharing:</strong> Collaborate with your team<br>\n                • <strong>Advanced Search:</strong> Find frames by tags & content\n              </div>\n            </div>\n            \n            <!-- Step 1: Login/Register -->\n            <div style=\"margin-bottom: 12px;\">\n              <div style=\"font-size: 0.7em; font-weight: 500; margin-bottom: 6px; color: #333;\">Step 1: Login or Register</div>\n              <button id=\"loginWebBtnTab\" style=\"font-size: 0.7em; background: #1976d2; color: white; border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer; font-weight: 500; width: auto; display: inline-block;\">Login / Register to FigDex Web</button>\n            </div>\n\n            <!-- Step 2: API Key Section -->\n            <div id=\"apiKeySectionTab\" style=\"margin-bottom: 8px;\">\n              <div style=\"font-size: 0.7em; font-weight: 500; margin-bottom: 6px; color: #333;\">Step 2: Enter your API Key</div>\n              <div style=\"font-size: 0.6em; color: #666; margin-bottom: 6px;\">After logging in, you'll receive an API key to enter below:</div>\n              <input type=\"password\" id=\"apiKeyInputTab\" placeholder=\"Enter your API key\" style=\"width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.7em; box-sizing: border-box;\">\n              <button id=\"saveApiKeyBtnTab\" style=\"margin-top: 6px; font-size: 0.7em; background: #4caf50; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer;\">Save API Key</button>\n            </div>\n          </div>\n          \n          <!-- Connected-as label (shown only when connected) -->\n          <div id=\"connectedAsTab\" style=\"display:none; margin-bottom: 8px; font-size: 0.7em; color: #2e7d32;\">\n            Connected as: <span id=\"connectedAsEmailTab\" style=\"font-weight:600;\"></span>\n          </div>\n        </div>\n      </div>\n      \n      <!-- Frame Tags Section -->\n      <div id=\"frameTagsSectionTab\" style=\"margin-top: 16px; margin-bottom: 12px; padding: 10px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;\">\n        <div style=\"font-size: 0.8em; font-weight: 600; margin-bottom: 6px; color: #1976d2;\">Frame Tags</div>\n        <div style=\"font-size: 0.7em; color: #666; margin-bottom: 6px;\">Add tags to selected frames for better organization</div>\n        \n        <!-- Predefined Tags -->\n        <div style=\"margin-bottom: 8px;\">\n          <div style=\"font-size: 0.7em; font-weight: 500; margin-bottom: 4px; color: #333;\">Quick Tags:</div>\n          <div id=\"predefinedTagsTab\" style=\"display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;\">\n            <button class=\"tag-btn\" data-tag=\"No-Index\" style=\"font-size: 0.7em; background: #fff; color: #1976d2; border: 1px solid #e0e0e0; border-radius: 4px; padding: 4px 8px; cursor: pointer;\">No-Index</button>\n            <button class=\"tag-btn\" data-tag=\"Mobile\" style=\"font-size: 0.7em; background: #fff; color: #1976d2; border: 1px solid #e0e0e0; border-radius: 4px; padding: 4px 8px; cursor: pointer;\">Mobile</button>\n            <button class=\"tag-btn\" data-tag=\"Desktop\" style=\"font-size: 0.7em; background: #fff; color: #1976d2; border: 1px solid #e0e0e0; border-radius: 4px; padding: 4px 8px; cursor: pointer;\">Desktop</button>\n            <button class=\"tag-btn\" data-tag=\"iOS\" style=\"font-size: 0.7em; background: #fff; color: #1976d2; border: 1px solid #e0e0e0; border-radius: 4px; padding: 4px 8px; cursor: pointer;\">iOS</button>\n            <button class=\"tag-btn\" data-tag=\"Android\" style=\"font-size: 0.7em; background: #fff; color: #1976d2; border: 1px solid #e0e0e0; border-radius: 4px; padding: 4px 8px; cursor: pointer;\">Android</button>\n            <button class=\"tag-btn\" data-tag=\"Web\" style=\"font-size: 0.7em; background: #fff; color: #1976d2; border: 1px solid #e0e0e0; border-radius: 4px; padding: 4px 8px; cursor: pointer;\">Web</button>\n          </div>\n        </div>\n        \n        <!-- Selected Frames Info -->\n        <div id=\"selectedFramesInfoTab\" style=\"font-size: 0.7em; color: #666; margin-bottom: 8px;\">No frames selected</div>\n        \n        <!-- Current Tags -->\n        <div id=\"currentTagsTab\" style=\"margin-bottom: 8px;\">\n          <div style=\"font-size: 0.7em; font-weight: 500; margin-bottom: 4px; color: #333;\">Current Tags:</div>\n          <div id=\"currentTagsListTab\" style=\"font-size: 0.7em; color: #666;\">No tags added yet</div>\n        </div>\n        \n        <!-- Add Custom Tag Section -->\n        <div id=\"addCustomTagSectionTab\" style=\"margin-top: 8px; padding: 0; background: transparent; border-radius: 6px; border: none; display: none;\">\n          <div style=\"font-size: 0.7em; font-weight: 600; margin-bottom: 6px; color: #1976d2;\">Add Custom Tag</div>\n          <div style=\"display: flex; gap: 6px; align-items: center;\">\n            <input type=\"text\" id=\"customTagInputTab\" placeholder=\"Enter tag name...\" style=\"flex: 1; padding: 6px 8px; border: 1px solid #e0e0e0; border-radius: 4px; font-size: 0.7em; box-sizing: border-box; background: white;\">\n            <button id=\"addCustomTagBtnTab\" style=\"font-size: 0.7em; background: #fff; color: #1976d2; border: 1px solid #e0e0e0; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-weight: 500;\">Add</button>\n          </div>\n        </div>\n      </div>\n    </div>\n\n      \n      <!-- Overlay and Drawer for Progress -->\n      <div id=\"progressOverlay\" style=\"display:none; position:fixed; left:0; top:0; width:100vw; height:100vh; background:rgba(30,30,40,0.45); z-index:1000; transition: opacity 0.3s ease;\"></div>\n      <div id=\"progressDrawer\" style=\"display:none; position:fixed; left:0; bottom:0; width:100%; max-height:80vh; background:#fff; box-shadow:0 -4px 24px rgba(0,0,0,0.2); z-index:1001; border-radius:16px 16px 0 0; overflow-y:auto; transform:translateY(100%); transition:transform 0.3s ease-out;\" onclick=\"event.stopPropagation();\">\n        <div style=\"position:relative; padding:20px; max-width:386px; margin:0 auto;\">\n          <!-- Close Button -->\n          <button id=\"closeProgressDrawerBtn\" style=\"position:absolute; top:16px; right:16px; background:transparent; border:none; font-size:1.5em; color:#666; cursor:pointer; padding:0; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; transition:background 0.2s;\" onmouseover=\"this.style.background='#f0f0f0';\" onmouseout=\"this.style.background='transparent';\" title=\"Close\">×</button>\n          \n          <!-- Drawer Handle -->\n          <div style=\"width:40px; height:4px; background:#ddd; border-radius:2px; margin:0 auto 16px auto;\"></div>\n          \n          <!-- Progress Content -->\n          <div id=\"progressDrawerContent\" style=\"margin-top: 8px;\">\n            <div id=\"loading\" style=\"display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:12px; font-size:0.9em; color:#333; margin-top:24px;\">\n              <span class=\"spinner\"></span>\n              <span id=\"progressStatusText\">Running FigDex...</span>\n            </div>\n            <!-- Overall Progress Container -->\n            <div id=\"overallProgressContainer\" style=\"display:none;\">\n              <div id=\"overallProgressBarBg\" style=\"background:#eee; border-radius:8px; height:24px; width:100%; position:relative; overflow:hidden; margin-bottom:8px;\">\n                <div id=\"overallProgressBar\" style=\"background:#1976d2; height:100%; width:0%; border-radius:8px; transition:width 0.3s ease;\"></div>\n                <span id=\"overallProgressText\" style=\"position:absolute; left:50%; top:50%; transform:translate(-50%, -50%); font-size:0.75em; font-weight:600; color:#1976d2; white-space:nowrap;\">0%</span>\n              </div>\n              <div id=\"overallProgressDetails\" style=\"font-size:0.75em; color:#666; text-align:center; margin-bottom:8px;\"></div>\n            </div>\n            <!-- Progress Bar -->\n            <div id=\"runningProgressBarContainer\" style=\"width:100%; margin:0 auto; display:none;\">\n              <div id=\"runningProgressBarBg\" style=\"background:#eee; border-radius:8px; height:8px; width:100%; position:relative; overflow:hidden; margin-bottom:8px;\">\n                <div id=\"runningProgressBar\" style=\"background:#1976d2; height:100%; width:0%; border-radius:8px; transition:width 0.3s ease;\"></div>\n              </div>\n              <div id=\"progressDetails\" style=\"font-size:0.75em; color:#666; margin-top:4px; min-height:16px; text-align:center;\"></div>\n            </div>\n            \n            <div id=\"doneMsg\" style=\"margin-top:18px; display:none; text-align:center; color:#4caf50; font-weight:500;\">FigDex created successfully!</div>\n            <div id=\"openWebCta\" style=\"display:none; margin-top:16px; text-align:center;\">\n              <button id=\"openWebBtn\" style=\"background:#1976d2; color:#fff; border:none; border-radius:8px; padding:10px 18px; cursor:pointer; font-size:0.9em; font-weight:600; width:100%;\">Open FigDex Web</button>\n              <div style=\"font-size:0.7em; color:#666; margin-top:6px;\">You can open your gallery while we keep preparing screens.</div>\n            </div>\n            <div id=\"errorMsg\" style=\"margin-top:18px; display:none; text-align:center; color:#d32f2f; font-weight:500;\"></div>\n          </div>\n        </div>\n      </div>\n      \n      <!-- Overlay and Drawer for Success Screen -->\n      <div id=\"successOverlay\" style=\"display:none; position:fixed; left:0; top:0; width:100vw; height:100vh; background:rgba(30,30,40,0.45); z-index:1000; transition: opacity 0.3s ease;\"></div>\n      <!-- Login Drawer -->\n      <div id=\"loginOverlay\" style=\"display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:1000; transition:opacity 0.3s;\"></div>\n      <div id=\"loginDrawer\" style=\"display:none; position:fixed; left:0; bottom:0; width:100%; height:90vh; max-height:90vh; background:#fff; box-shadow:0 -4px 24px rgba(0,0,0,0.2); z-index:1001; border-radius:16px 16px 0 0; overflow:hidden; transform:translateY(100%); transition:transform 0.3s ease-out;\" onclick=\"event.stopPropagation();\">\n        <div style=\"position:relative; padding:0; height:100%; display:flex; flex-direction:column;\">\n          <div style=\"padding:16px 20px 12px 20px; flex-shrink:0;\">\n            <div style=\"width:40px; height:4px; background:#ddd; border-radius:2px; margin:0 auto 8px; cursor:grab;\"></div>\n            <button id=\"closeLoginDrawerBtn\" style=\"position:absolute; top:16px; right:16px; background:transparent; border:none; font-size:1.5em; color:#666; cursor:pointer; padding:0; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; transition:background 0.2s; z-index:10;\" onmouseover=\"this.style.background='#f0f0f0';\" onmouseout=\"this.style.background='transparent';\" title=\"Close\">×</button>\n          </div>\n          <div id=\"loginDrawerContent\" style=\"flex:1; display:flex; flex-direction:column; overflow:hidden; position:relative; min-height:0;\">\n            <iframe id=\"loginIframe\" src=\"\" style=\"width:100%; height:100%; border:none; flex:1; min-height:0;\" allow=\"popups popups-to-escape-sandbox\" sandbox=\"allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation\"></iframe>\n            <div id=\"loginIframeError\" style=\"display:none; position:absolute; top:0; left:0; right:0; bottom:0; background:#fff; text-align:center; padding:40px 20px; display:flex; flex-direction:column; align-items:center; justify-content:center;\">\n              <div style=\"font-size:1.1em; color:#666; margin-bottom:8px; font-weight:500;\">Unable to load login page</div>\n              <div style=\"font-size:0.85em; color:#999; margin-bottom:20px;\">The login page cannot be displayed in this window</div>\n              <button onclick=\"openWebLoginInNewWindow()\" style=\"background:#1976d2; color:white; border:none; border-radius:6px; padding:10px 20px; cursor:pointer; font-size:0.9em; font-weight:500;\">Open in New Window</button>\n            </div>\n            <div id=\"loginIframeLoading\" style=\"position:absolute; top:0; left:0; right:0; bottom:0; background:#fff; display:flex; align-items:center; justify-content:center; flex-direction:column;\">\n              <div style=\"width:40px; height:40px; border:4px solid #f3f3f3; border-top:4px solid #1976d2; border-radius:50%; animation:spin 1s linear infinite; margin-bottom:16px;\"></div>\n              <div style=\"font-size:0.85em; color:#666;\">Loading login page...</div>\n            </div>\n          </div>\n        </div>\n      </div>\n      \n      <style>\n        @keyframes spin {\n          0% { transform: rotate(0deg); }\n          100% { transform: rotate(360deg); }\n        }\n      </style>\n\n      <div id=\"successDrawer\" style=\"display:none; position:fixed; left:0; bottom:0; width:100%; max-height:80vh; background:#fff; box-shadow:0 -4px 24px rgba(0,0,0,0.2); z-index:1001; border-radius:16px 16px 0 0; overflow-y:auto; transform:translateY(100%); transition:transform 0.3s ease-out;\" onclick=\"event.stopPropagation();\">\n        <div style=\"position:relative; padding:20px; max-width:386px; margin:0 auto;\">\n          <!-- Close Button -->\n          <button id=\"closeSuccessDrawerBtn\" style=\"position:absolute; top:16px; right:16px; background:transparent; border:none; font-size:1.5em; color:#666; cursor:pointer; padding:0; width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:50%; transition:background 0.2s;\" onmouseover=\"this.style.background='#f0f0f0';\" onmouseout=\"this.style.background='transparent';\" title=\"Close\">×</button>\n          \n          <!-- Drawer Handle -->\n          <div style=\"width:40px; height:4px; background:#ddd; border-radius:2px; margin:0 auto 16px auto;\"></div>\n          \n          <!-- Success Screen Content -->\n          <div id=\"successDrawerContent\" style=\"margin-top: 8px;\">\n            <!-- First Box: Success Message -->\n            <div style=\"background: #f5f5f5; border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; margin-bottom: 16px; margin-top: 24px;\">\n              <div style=\"display: flex; align-items: center; gap: 12px;\">\n                <div style=\"width: 32px; height: 32px; border-radius: 50%; background: #4caf50; display: flex; align-items: center; justify-content: center; flex-shrink: 0;\">\n                  <span style=\"color: white; font-size: 20px; font-weight: bold;\">✓</span>\n                </div>\n                <div>\n                  <div style=\"font-weight: 600; font-size: 0.9em; color: #333; margin-bottom: 2px;\">Index created successfully</div>\n                  <div style=\"font-size: 0.75em; color: #666;\">Your file has been indexed locally.</div>\n                </div>\n              </div>\n            </div>\n            \n            <!-- Web Connection Section -->\n            <div id=\"successMarketingBox\" style=\"margin-bottom: 16px; padding: 10px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e0e0e0;\">\n              <div style=\"font-size: 0.8em; font-weight: 600; margin-bottom: 6px; color: #1976d2;\">Web Connection</div>\n              <div style=\"font-size: 0.8em; color: #666; margin-bottom: 12px;\">\n                <div style=\"font-weight: 600; margin-bottom: 8px; color: #1976d2; font-size: 0.85em;\">Why connect to FigDex Web?</div>\n                <div style=\"font-size: 0.78em; line-height: 1.5;\">\n                  • <strong>Cloud Storage:</strong> Save your indices online<br>\n                  • <strong>Team Sharing:</strong> Collaborate with your team<br>\n                  • <strong>Advanced Search:</strong> Find frames by tags & content\n                </div>\n              </div>\n              \n              <!-- Step 1: Login/Register -->\n              <div style=\"margin-bottom: 12px;\">\n                <div style=\"font-size: 0.7em; font-weight: 500; margin-bottom: 6px; color: #333;\">Step 1: Login or Register</div>\n                <button onclick=\"openWebLogin()\" style=\"font-size: 0.7em; background: #1976d2; color: white; border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer; font-weight: 500; width: 100%; margin-bottom: 8px;\">Login / Register with Google</button>\n              </div>\n\n              <!-- Step 2: API Key Section -->\n              <div id=\"successApiKeySection\" style=\"margin-bottom: 8px;\">\n                <div style=\"font-size: 0.7em; font-weight: 500; margin-bottom: 6px; color: #333;\">Step 2: Enter your API Key</div>\n                <div style=\"font-size: 0.6em; color: #666; margin-bottom: 6px;\">After logging in, you'll receive an API key to enter below:</div>\n                <input type=\"password\" id=\"successApiKeyInput\" placeholder=\"Enter your API key\" style=\"width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.7em; box-sizing: border-box;\">\n                <button id=\"successSaveApiKeyBtn\" style=\"margin-top: 6px; font-size: 0.7em; background: #4caf50; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer;\">Save API Key</button>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n\n    <!-- New flow modules (hard reset) - inlined so they run in same window (Figma plugin UI) -->\n    <script>\n    (function(global) {\n      'use strict';\n      var PREFIX = '[FigDex]';\n      var DEBUG_LOGS = false;\n      var _sessionId = '';\n      var _anonId = '';\n      var _pluginVersion = '0.0.0';\n      function randomId() {\n        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';\n        var s = '';\n        for (var i = 0; i < 24; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));\n        return s;\n      }\n      _sessionId = randomId();\n      function log(event, data) {\n        if (!DEBUG_LOGS) return;\n        if (data !== undefined && data !== null) {\n          try { console.log(PREFIX, event, data); } catch (e) {}\n        } else {\n          try { console.log(PREFIX, event); } catch (e) {}\n        }\n      }\n      function setAnonId(id) { _anonId = typeof id === 'string' ? id : ''; }\n      function setPluginVersion(v) { _pluginVersion = typeof v === 'string' ? v : _pluginVersion; }\n      function hashFileKey(str) {\n        if (typeof str !== 'string' || !str) return null;\n        var h = 2166136261;\n        for (var i = 0; i < str.length; i++) {\n          h ^= str.charCodeAt(i);\n          h = (h * 16777619) >>> 0;\n        }\n        return 'h' + (h >>> 0).toString(36);\n      }\n      function track(eventName, context) {\n        if (!_anonId || !_sessionId) return;\n        context = context || {};\n        var payload = {\n          eventName: eventName,\n          timestamp: Date.now(),\n          pluginVersion: _pluginVersion,\n          userType: context.userType || 'NEW',\n          hasFileKey: !!context.hasFileKey,\n          selectedPagesCount: Math.max(0, Math.min(500, parseInt(context.selectedPagesCount, 10) || 0)),\n          fileKeyHash: context.fileKeyHash || null,\n          sessionId: _sessionId,\n          anonId: _anonId,\n          userId: context.userId || null,\n          meta: context.meta || {}\n        };\n        try {\n          fetch('https://www.figdex.com/api/telemetry', {\n            method: 'POST',\n            headers: { 'Content-Type': 'application/json' },\n            body: JSON.stringify(payload),\n            keepalive: true\n          }).catch(function() {});\n        } catch (e) {}\n      }\n      global.__figdexTelemetry = { log: log, track: track, setAnonId: setAnonId, setPluginVersion: setPluginVersion, hashFileKey: hashFileKey };\n    })(window);\n    </script>\n    <script>\n    (function(global) {\n      'use strict';\n      var _token = '';\n      var _user = null;\n      function getIdentity() {\n        var exists = !!(_token && typeof _token === 'string' && _token.length > 0);\n        var tokenMasked = exists ? (_token.length <= 10 ? _token.substring(0, 10) + '...' : _token.substring(0, 10) + '...') : '';\n        return { exists: exists, tokenMasked: tokenMasked, token: _token, user: _user };\n      }\n      function setIdentity(token, user) {\n        _token = typeof token === 'string' ? token : '';\n        _user = user !== undefined ? user : null;\n      }\n      function clearIdentity() {\n        _token = '';\n        _user = null;\n      }\n      function isConnected() {\n        return !!(_token && typeof _token === 'string' && _token.trim().length > 0);\n      }\n      global.__figdexIdentityStore = {\n        getIdentity: getIdentity,\n        setIdentity: setIdentity,\n        clearIdentity: clearIdentity,\n        isConnected: isConnected\n      };\n    })(window);\n    </script>\n    <script>\n    (function(global) {\n      'use strict';\n      var _telemetry = null;\n      function init(opts) {\n        _telemetry = opts && opts.telemetry ? opts.telemetry : global.__figdexTelemetry;\n      }\n      function runIndexing(selectedPages, identity, callbacks) {\n        callbacks = callbacks || {};\n        if (!identity || !identity.token) {\n          if (callbacks.onError) callbacks.onError('no_identity');\n          return;\n        }\n        if (_telemetry) _telemetry.log('indexing_start');\n        if (typeof callbacks.onStart === 'function') callbacks.onStart();\n        if (typeof callbacks.onLegacyStart === 'function') {\n          callbacks.onLegacyStart(selectedPages, identity);\n        } else {\n          if (callbacks.onError) callbacks.onError('no_legacy_start');\n        }\n      }\n      global.__figdexIndexEngine = {\n        init: init,\n        runIndexing: runIndexing\n      };\n    })(window);\n    </script>\n    <script>\n    (function(global) {\n      'use strict';\n      var STATES = {\n        BOOT: 'BOOT',\n        READY_TO_SETUP: 'READY_TO_SETUP',\n        NEEDS_CONNECT: 'NEEDS_CONNECT',\n        READY_TO_INDEX: 'READY_TO_INDEX',\n        INDEXING: 'INDEXING',\n        DONE: 'DONE',\n        ERROR: 'ERROR'\n      };\n      var _state = STATES.BOOT;\n      var _pendingAction = null;\n      var _identityStore = null;\n      var _telemetry = null;\n      var _onTrack = null;\n      var _onOpenWeb = null;\n      var _onRunIndexing = null;\n      var _onStateChange = null;\n      var _trace = false;\n      function getState() { return _state; }\n      function getPendingAction() { return _pendingAction; }\n      function clearPendingAction() { _pendingAction = null; }\n      function _traceTransition(prev, event, next) {\n        if (_trace && _telemetry) {\n          _telemetry.log('state_change', { prevState: prev, event: event, nextState: next });\n        }\n      }\n      function dispatch(event, payload) {\n        try {\n        var prev = _state;\n        payload = payload || {};\n        switch (_state) {\n          case STATES.BOOT:\n            if (event === 'identity_loaded') {\n              _state = _identityStore && _identityStore.isConnected() ? STATES.READY_TO_INDEX : STATES.READY_TO_SETUP;\n              _traceTransition(prev, event, _state);\n            } else if (event === 'UI_CREATE_INDEX_CLICKED') {\n              var sel = payload.selectedPages || [];\n              _state = STATES.INDEXING;\n              if (_telemetry) _telemetry.log('indexing_start');\n              if (_onTrack) _onTrack('indexing_start');\n              _traceTransition(prev, 'EVT_CREATE_INDEX_REQUESTED', _state);\n              if (_onRunIndexing) _onRunIndexing(sel);\n            }\n            break;\n          case STATES.READY_TO_SETUP:\n            if (event === 'identity_loaded' && _identityStore && _identityStore.isConnected()) {\n              _state = STATES.READY_TO_INDEX;\n              _traceTransition(prev, event, _state);\n            } else if (event === 'file_link_saved') {\n              _state = STATES.READY_TO_INDEX;\n              _traceTransition(prev, event, _state);\n            } else if (event === 'UI_CREATE_INDEX_CLICKED') {\n              var selectedPages0 = payload.selectedPages || [];\n              _state = STATES.INDEXING;\n              if (_telemetry) _telemetry.log('indexing_start');\n              if (_onTrack) _onTrack('indexing_start');\n              _traceTransition(prev, 'EVT_CREATE_INDEX_REQUESTED', _state);\n              if (_onRunIndexing) _onRunIndexing(selectedPages0);\n            }\n            break;\n          case STATES.READY_TO_INDEX:\n            if (event === 'file_link_saved') {\n              _state = STATES.READY_TO_INDEX;\n              _traceTransition(prev, event, _state);\n            } else if (event === 'UI_CREATE_INDEX_CLICKED') {\n              var selectedPages = payload.selectedPages || [];\n              _state = STATES.INDEXING;\n              if (_telemetry) _telemetry.log('indexing_start');\n              if (_onTrack) _onTrack('indexing_start');\n              _traceTransition(prev, 'EVT_CREATE_INDEX_REQUESTED', _state);\n              if (_onRunIndexing) _onRunIndexing(selectedPages);\n            } else if (event === 'identity_loaded' && _identityStore && _identityStore.isConnected()) {\n              _state = STATES.READY_TO_INDEX;\n              _traceTransition(prev, event, _state);\n            } else if (event === 'intent_open_web') {\n              if (_telemetry) _telemetry.log('intent', { action: 'open_web' });\n              if (_onOpenWeb) _onOpenWeb();\n            }\n            break;\n          case STATES.NEEDS_CONNECT:\n            if (event === 'EVT_CONNECT_SUCCESS') {\n              var pa = _pendingAction;\n              if (_telemetry) _telemetry.log('connect_success');\n              if (_onTrack) _onTrack('connect_success');\n              _pendingAction = null;\n              _state = STATES.READY_TO_INDEX;\n              _traceTransition(prev, event, _state);\n              if (pa && pa.type === 'START_INDEXING' && pa.selectedPages && _onRunIndexing) {\n                _state = STATES.INDEXING;\n                if (_telemetry) _telemetry.log('indexing_start');\n                if (_onTrack) _onTrack('indexing_start');\n                _traceTransition(STATES.READY_TO_INDEX, 'resume_pending', _state);\n                _onRunIndexing(pa.selectedPages);\n              }\n            }\n            break;\n          case STATES.INDEXING:\n            if (event === 'web_index_created') {\n              if (_telemetry) _telemetry.log('web_index_created');\n              _state = STATES.DONE;\n              _traceTransition(prev, event, _state);\n            } else if (event === 'indexing_done') {\n              if (_telemetry) _telemetry.log('indexing_done');\n              if (_onTrack) _onTrack('indexing_done');\n              _state = STATES.DONE;\n              _traceTransition(prev, event, _state);\n            } else if (event === 'indexing_failed') {\n              if (_telemetry) _telemetry.log('error', { type: 'indexing_failed', message: payload.message });\n              _state = STATES.ERROR;\n              _traceTransition(prev, event, _state);\n            } else if (event === 'auth_expired') {\n              if (_identityStore) _identityStore.clearIdentity();\n              _state = STATES.READY_TO_SETUP;\n              _traceTransition(prev, event, _state);\n            }\n            break;\n          case STATES.DONE:\n          case STATES.ERROR:\n            if (event === 'reset') {\n              _state = _identityStore && _identityStore.isConnected() ? STATES.READY_TO_INDEX : STATES.READY_TO_SETUP;\n              _traceTransition(prev, event, _state);\n            } else if (event === 'intent_open_web') {\n              if (_telemetry) _telemetry.log('intent', { action: 'open_web' });\n              if (_onOpenWeb) _onOpenWeb();\n            }\n            break;\n          default:\n            break;\n        }\n        if (_onStateChange) try { _onStateChange(_state); } catch (e) {}\n        return _state;\n        } catch (e) {\n          try { console.error('[FigDex] dispatch_error', event, e); } catch (e2) {}\n          _state = STATES.ERROR;\n          if (_onStateChange) try { _onStateChange(_state); } catch (e2) {}\n          return _state;\n        }\n      }\n      function init(opts) {\n        _identityStore = opts.identityStore || global.__figdexIdentityStore;\n        _telemetry = opts.telemetry || global.__figdexTelemetry;\n        _onTrack = opts.onTrack || null;\n        _onOpenWeb = opts.onOpenWeb || null;\n        _onRunIndexing = opts.onRunIndexing || null;\n        _onStateChange = opts.onStateChange || null;\n        _trace = opts.trace !== false;\n      }\n      global.__figdexFlowController = {\n        STATES: STATES,\n        getState: getState,\n        getPendingAction: getPendingAction,\n        clearPendingAction: clearPendingAction,\n        dispatch: dispatch,\n        init: init\n      };\n    })(window);\n    </script>\n    <script>\n      var state = { documentId: null, fileKey: '', pages: [], selectedPages: [], identity: null, identityPending: null, accountLimits: null, pluginVersion: '', step1Expanded: false, resultUrl: '', lastIndexError: '', lastIndexErrorCode: null, lastIndexUpgradeUrl: null, connectTimedOut: false, authExpiredMessage: '', hasEverCompletedIndex: false, indexingStatusText: 'Updating index…', indexingStartedAt: 0, indexingLastProgressAt: 0 };\n      try { window.__figdexUIState = state; } catch (e) {}\n      var controller = null;\n      var identityStore = null;\n      var telemetry = null;\n\n      function buildTelemetryContext() {\n        var id = identityStore ? identityStore.getIdentity() : null;\n        var uid = (id && id.user && (id.user.id || id.user.email)) ? String(id.user.id || id.user.email) : null;\n        return {\n          userType: (id && id.exists) ? 'RETURNING' : 'NEW',\n          hasFileKey: !!(state && state.fileKey),\n          selectedPagesCount: (state && state.selectedPages) ? state.selectedPages.length : 0,\n          fileKeyHash: (state && state.fileKey && telemetry && telemetry.hashFileKey) ? telemetry.hashFileKey(state.fileKey) : null,\n          userId: uid || null,\n          meta: {}\n        };\n      }\n      function onClearDataClick() {\n        var statusEl = document.getElementById('fileKeyInlineStatus');\n        if (statusEl) { statusEl.textContent = 'Cleared'; statusEl.style.color = '#43a047'; }\n        forceClearUI();\n        sendIntent('clear-storage');\n        try { window.open('https://www.figdex.com/logout?redirect=gallery', 'figdex_web'); } catch (e) {}\n        setTimeout(function() {\n          var s = document.getElementById('fileKeyInlineStatus');\n          if (s && s.textContent === 'Cleared') s.textContent = '';\n        }, 2500);\n      }\n      window.__figdexClearData = onClearDataClick;\n\n      function onSaveFileKeyClick() {\n        var input = document.getElementById('fileKeyInlineInput');\n        if (!input) return;\n        var url = (input.value || '').trim();\n        var key = url.match(/(?:file|design|board|slides|deck)\\/([a-zA-Z0-9_-]{10,128})/);\n        var fileKey = key ? key[1] : null;\n        if (!fileKey) {\n          var status = document.getElementById('fileKeyInlineStatus');\n          if (status) { status.textContent = 'Invalid Figma link! Paste a link like figma.com/design/... or figma.com/file/...'; status.style.color = '#d32f2f'; }\n          return;\n        }\n        sendIntent('set-file-key', { fileKey: fileKey });\n        state.fileKey = fileKey;\n        if (telemetry && telemetry.track) telemetry.track('filekey_saved', buildTelemetryContext());\n        if (controller) controller.dispatch('file_link_saved');\n        var statusEl = document.getElementById('fileKeyInlineStatus');\n        if (statusEl) { statusEl.textContent = 'Loading pages...'; statusEl.style.color = '#1976d2'; }\n        sendIntent('refresh-pages');\n        sendIntent('get-file-thumbnail', { fileKey: fileKey });\n        render(state, { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null });\n      }\n\n      function forceClearUI() {\n        state.fileKey = '';\n        state.pages = [];\n        state.selectedPages = [];\n        state.step1Expanded = false;\n        var inputEl = document.getElementById('fileKeyInlineInput');\n        if (inputEl) inputEl.value = '';\n        var statusEl = document.getElementById('fileKeyInlineStatus');\n        if (statusEl) { statusEl.textContent = ''; statusEl.style.color = ''; }\n        var setStatusEl = document.getElementById('fileKeySetStatus');\n        if (setStatusEl) setStatusEl.textContent = '';\n        var listDiv = document.getElementById('pagesList');\n        if (listDiv) { listDiv.innerHTML = ''; listDiv.style.display = 'none'; }\n        var thumbContainer = document.getElementById('fileThumbnailContainer');\n        var thumbImg = document.getElementById('fileThumbnail');\n        if (thumbContainer) thumbContainer.style.display = 'none';\n        if (thumbImg) thumbImg.src = '';\n        var pagesLockedHint = document.getElementById('pagesLockedHint');\n        if (pagesLockedHint) pagesLockedHint.style.display = 'block';\n        var advanceBtn = document.getElementById('advanceBtn');\n        if (advanceBtn) advanceBtn.disabled = true;\n      }\n\n      function currentFileHasIndexedPages(pages) {\n        if (!Array.isArray(pages)) return false;\n        return pages.some(function(p) {\n          return p && (p.status === 'up_to_date' || p.status === 'needs_update');\n        });\n      }\n\n      function getConnectedUserLabel(identity) {\n        if (!identity || !identity.exists) return 'Guest mode';\n        var user = identity.user || {};\n        var email = typeof user.email === 'string' ? user.email.trim() : '';\n        var fullName = typeof user.full_name === 'string' ? user.full_name.trim() : '';\n        var name = typeof user.name === 'string' ? user.name.trim() : '';\n        var id = typeof user.id === 'string' ? user.id.trim() : '';\n        if (email) return email;\n        if (fullName) return fullName;\n        if (name) return name;\n        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return 'Connected account';\n        return id || 'Connected user';\n      }\n\n      function getConnectedPlanLabel(identity) {\n        if (!identity || !identity.exists) return 'Guest';\n        var user = identity.user || {};\n        var plan = String(user.plan || '').toLowerCase();\n        if (plan === 'pro') return 'Pro';\n        if (plan === 'team') return 'Team';\n        if (plan === 'unlimited') return 'Unlimited';\n        return 'Free';\n      }\n\n      function formatLimitValue(value) {\n        if (value === null || value === undefined) return 'Unlimited';\n        var num = Number(value);\n        if (!isFinite(num)) return 'Unlimited';\n        return num.toLocaleString();\n      }\n\n      function getAccountUsageSummary() {\n        var limits = state.accountLimits;\n        if (!limits || typeof limits !== 'object') return null;\n        return {\n          files: formatLimitValue(limits.currentFiles || 0) + ' / ' + formatLimitValue(limits.maxFiles),\n          frames: formatLimitValue(limits.currentFrames || 0) + ' / ' + formatLimitValue(limits.maxFrames),\n          currentFiles: Number(limits.currentFiles || 0),\n          maxFiles: limits.maxFiles,\n          currentFrames: Number(limits.currentFrames || 0),\n          maxFrames: limits.maxFrames\n        };\n      }\n\n      function getUsageRatio(currentValue, maxValue) {\n        var current = Number(currentValue || 0);\n        if (!isFinite(current) || current < 0) current = 0;\n        if (maxValue === null || maxValue === undefined) return { percent: 12, tone: '' };\n        var max = Number(maxValue);\n        if (!isFinite(max) || max <= 0) return { percent: 0, tone: '' };\n        var ratio = Math.max(0, Math.min(1, current / max));\n        var percent = Math.max(4, Math.round(ratio * 100));\n        var tone = '';\n        if (ratio >= 1) tone = 'danger';\n        else if (ratio >= 0.8) tone = 'warn';\n        return { percent: percent, tone: tone };\n      }\n\n      function getCurrentFileSummary(model) {\n        var pages = Array.isArray(model.pages) ? model.pages : [];\n        var selectedPages = Array.isArray(model.selectedPages) ? model.selectedPages : [];\n        var indexablePages = pages.filter(function(p) {\n          return p && p.hasFrames !== false && !p.isIndexPage && !p.isCoverPage;\n        });\n        var indexedPages = pages.filter(function(p) { return p && p.status === 'up_to_date'; }).length;\n        var dirtyPages = pages.filter(function(p) { return p && p.status === 'needs_update'; }).length;\n        var hasIndexedCurrentFile = !!(model.fileKey && currentFileHasIndexedPages(pages));\n        if (!model.fileKey) {\n          return { badge: 'Link required', badgeBg: '#f5f5f5', badgeColor: '#666', title: 'This file is not linked yet.', detail: 'Paste the Figma file link to load pages and keep this file synced correctly.' };\n        }\n        if (!pages.length) {\n          return { badge: 'Loading pages', badgeBg: '#e3f2fd', badgeColor: '#1565c0', title: 'This file is linked.', detail: 'Loading pages for this file now.' };\n        }\n        if (!hasIndexedCurrentFile) {\n          return { badge: 'Not indexed', badgeBg: '#fff3e0', badgeColor: '#8d6e63', title: 'This file is ready for its first index.', detail: 'This file is linked and ready for indexing.' };\n        }\n        if (dirtyPages > 0) {\n          return { badge: 'Needs update', badgeBg: '#fff8e1', badgeColor: '#a66b00', title: 'This file already has an index.', detail: 'This file is linked and has changes ready to update.' };\n        }\n        return { badge: 'Indexed', badgeBg: '#e8f5e9', badgeColor: '#2e7d32', title: 'This file is indexed and up to date.', detail: 'This file is linked and synced with FigDex.' };\n      }\n\n      function getPagesSummary(model) {\n        var pages = Array.isArray(model.pages) ? model.pages : [];\n        var selectablePages = pages.filter(function(p) {\n          return p && p.hasFrames !== false && !p.isIndexPage && !p.isCoverPage;\n        });\n        var indexed = selectablePages.filter(function(p) { return p.status === 'up_to_date'; }).length;\n        var updating = selectablePages.filter(function(p) { return p.status === 'needs_update'; }).length;\n        var fresh = Math.max(0, selectablePages.length - indexed - updating);\n        return {\n          selectable: selectablePages.length,\n          indexed: indexed,\n          updating: updating,\n          fresh: fresh\n        };\n      }\n\n      function getPrimaryActionConfig(model, ctrlState) {\n        var pages = Array.isArray(model.pages) ? model.pages : [];\n        var selectedPages = Array.isArray(model.selectedPages) ? model.selectedPages : [];\n        var connected = !!(model.identity && model.identity.exists);\n        var isGuestPlan = !connected || getConnectedPlanLabel(model.identity) === 'Guest';\n        var hasPages = pages.length > 0;\n        var hasSelection = selectedPages.length > 0;\n        var currentFileIndexed = !!(model.fileKey && currentFileHasIndexedPages(pages));\n        var isAuthError = !!(state.authExpiredMessage === 'Session expired');\n        var isLimitError = state.lastIndexErrorCode === 'GUEST_FILE_LIMIT' || state.lastIndexErrorCode === 'GUEST_FRAME_LIMIT' || state.lastIndexErrorCode === 'FILE_LIMIT_REACHED' || state.lastIndexErrorCode === 'FRAME_LIMIT_REACHED';\n        if (ctrlState === 'INDEXING') return { title: 'Index in progress', detail: 'Please wait while FigDex prepares your gallery.', button: 'Indexing...', disabled: true, action: 'none' };\n        if (ctrlState === 'DONE') return { title: 'Index completed', detail: 'Open FigDex Web to review the updated gallery.', button: 'View in FigDex Web', disabled: false, action: 'open-web' };\n        if (ctrlState === 'ERROR') {\n          if (isAuthError) return { title: 'Reconnect required', detail: state.lastIndexError || 'Your session expired. Reconnect to continue indexing.', button: 'Reconnect', disabled: false, action: 'connect' };\n          if (isLimitError) return { title: 'Plan limit reached', detail: state.lastIndexError || 'This action exceeds your current plan limits.', button: isGuestPlan ? 'Create free account' : 'Upgrade to Pro', disabled: false, action: 'upgrade' };\n          return { title: 'Action blocked', detail: state.lastIndexError || 'Please review the message below and try again.', button: 'Try again', disabled: false, action: 'retry' };\n        }\n        if (!model.fileKey) return { title: 'Link this file first', detail: 'Paste the Figma file link before indexing.', button: 'Link file to continue', disabled: true, action: 'none' };\n        if (!hasPages) return { title: 'Loading pages', detail: 'Pages for this file are still loading.', button: 'Loading pages...', disabled: true, action: 'none' };\n        if (!hasSelection) return { title: 'Select at least one page', detail: 'Choose the pages you want to include in the gallery.', button: currentFileIndexed ? 'Select pages to update' : 'Select pages to index', disabled: true, action: 'none' };\n        return {\n          title: currentFileIndexed ? 'Ready to update index' : 'Ready to create index',\n          detail: currentFileIndexed ? 'Update the existing gallery with the selected pages.' : 'Create a searchable gallery for the selected pages in FigDex Web.',\n          button: currentFileIndexed ? 'Update index' : 'Create index',\n          disabled: false,\n          action: 'index'\n        };\n      }\n\n      function getIndexingPresentation(statusText) {\n        var raw = (statusText || 'Updating index…').toString();\n        var lower = raw.toLowerCase();\n        if (lower.indexOf('prepar') !== -1) return { stage: 'Preparing', detail: 'Checking the selected pages and getting the index ready.' };\n        if (lower.indexOf('export') !== -1) return { stage: 'Exporting', detail: 'Rendering frames from Figma before upload.' };\n        if (lower.indexOf('retry') !== -1) return { stage: 'Retrying', detail: 'A temporary issue was detected. FigDex is trying again automatically.' };\n        if (lower.indexOf('upload') !== -1) return { stage: 'Uploading', detail: 'Sending your selected pages to FigDex.' };\n        if (lower.indexOf('final') !== -1 || lower.indexOf('complete') !== -1) return { stage: 'Finalizing', detail: 'Finishing the gallery update on the server.' };\n        return { stage: 'Working', detail: 'Processing your selected pages and preparing the gallery.' };\n      }\n\n      function render(stateOrControllerState, model) {\n        if (!model) return;\n        var uiState = (typeof stateOrControllerState === 'string') ? (window.__figdexUIState || { step1Expanded: false }) : stateOrControllerState;\n        var ctrl = window.__figdexFlowController || controller;\n        var ctrlState = (typeof stateOrControllerState === 'string') ? stateOrControllerState : (ctrl ? ctrl.getState() : '');\n        var advanceBtn = document.getElementById('advanceBtn');\n        var listDiv = document.getElementById('pagesList');\n        var pagesLockedHint = document.getElementById('pagesLockedHint');\n        var step1Full = document.getElementById('fileKeyStep1Full');\n        var step1ChangeLink = document.getElementById('fileKeyStep1ChangeLink');\n        var pagesCard = document.getElementById('pagesCard');\n        var step1Collapsed = model.fileKey && model.pages && model.pages.length > 0 && !uiState.step1Expanded;\n        if (step1Full) step1Full.style.display = step1Collapsed ? 'none' : 'block';\n        if (step1ChangeLink) step1ChangeLink.style.display = step1Collapsed ? 'block' : 'none';\n        if (pagesCard) {\n          if (step1Collapsed) { pagesCard.classList.remove('step-disabled'); pagesCard.classList.add('step-complete'); }\n          else { pagesCard.classList.add('step-disabled'); pagesCard.classList.remove('step-complete'); }\n        }\n        if (!model.fileKey) {\n          if (listDiv) { listDiv.innerHTML = ''; listDiv.style.display = 'none'; }\n          if (pagesLockedHint) pagesLockedHint.style.display = 'block';\n          var thumbContainer = document.getElementById('fileThumbnailContainer');\n          var thumbImg = document.getElementById('fileThumbnail');\n          if (thumbContainer) thumbContainer.style.display = 'none';\n          if (thumbImg) thumbImg.src = '';\n        } else {\n          if (pagesLockedHint) pagesLockedHint.style.display = 'none';\n          if (model.pages && model.pages.length > 0) {\n            if (listDiv) listDiv.style.display = 'block';\n            renderPagesListContent(model.pages);\n          } else {\n            if (listDiv) { listDiv.innerHTML = ''; listDiv.style.display = 'block'; }\n            updateToggleSelectCheckbox(model.pages || []);\n          }\n        }\n        var actionCardButtonsWrap = document.getElementById('actionCardButtonsWrap');\n        if (actionCardButtonsWrap) actionCardButtonsWrap.style.display = ctrlState === 'ERROR' ? 'none' : 'flex';\n        var accountPlanBadge = document.getElementById('accountPlanBadge');\n        var accountIdentityLine = document.getElementById('accountIdentityLine');\n        var accountStatusLine = document.getElementById('accountStatusLine');\n        var accountUsageWrap = document.getElementById('accountUsageWrap');\n        var accountUsageFiles = document.getElementById('accountUsageFiles');\n        var accountUsageFrames = document.getElementById('accountUsageFrames');\n        var accountUsageFilesBar = document.getElementById('accountUsageFilesBar');\n        var accountUsageFramesBar = document.getElementById('accountUsageFramesBar');\n        var accountPrimaryBtn = document.getElementById('accountPrimaryBtn');\n        var currentFileBadge = document.getElementById('currentFileBadge');\n        var currentFileStatusLine = document.getElementById('currentFileStatusLine');\n        var actionStatusTitle = document.getElementById('actionStatusTitle');\n        var pagesSummaryChips = document.getElementById('pagesSummaryChips');\n        var selectAllPagesBtn = document.getElementById('selectAllPagesBtn');\n        var clearPagesBtn = document.getElementById('clearPagesBtn');\n        var primaryAction = getPrimaryActionConfig(model, ctrlState);\n        var fileSummary = getCurrentFileSummary(model);\n        var pagesSummary = getPagesSummary(model);\n        var connected = model.identity && model.identity.exists;\n        if (accountPlanBadge) {\n          accountPlanBadge.textContent = getConnectedPlanLabel(model.identity);\n          accountPlanBadge.style.background = connected ? '#e8f5e9' : '#fff3e0';\n          accountPlanBadge.style.color = connected ? '#2e7d32' : '#8d6e63';\n          accountPlanBadge.style.borderColor = connected ? '#c8e6c9' : '#ffe0b2';\n        }\n        if (accountIdentityLine) accountIdentityLine.textContent = getConnectedUserLabel(model.identity);\n        if (accountStatusLine) {\n          if (connected) accountStatusLine.textContent = 'Your account is connected and ready to work with this file.';\n          else if (state.authExpiredMessage) accountStatusLine.textContent = 'Reconnect to continue indexing and syncing this file.';\n          else accountStatusLine.textContent = 'You can create your first index here and continue on the web later.';\n        }\n        if (accountUsageWrap) {\n          var usageSummary = connected ? getAccountUsageSummary() : null;\n          accountUsageWrap.style.display = usageSummary ? 'block' : 'none';\n          if (usageSummary) {\n            if (accountUsageFiles) accountUsageFiles.textContent = usageSummary.files;\n            if (accountUsageFrames) accountUsageFrames.textContent = usageSummary.frames;\n            if (accountUsageFilesBar) {\n              var fileRatio = getUsageRatio(usageSummary.currentFiles, usageSummary.maxFiles);\n              accountUsageFilesBar.style.width = fileRatio.percent + '%';\n              accountUsageFilesBar.className = 'usage-fill' + (fileRatio.tone ? ' ' + fileRatio.tone : '');\n            }\n            if (accountUsageFramesBar) {\n              var frameRatio = getUsageRatio(usageSummary.currentFrames, usageSummary.maxFrames);\n              accountUsageFramesBar.style.width = frameRatio.percent + '%';\n              accountUsageFramesBar.className = 'usage-fill' + (frameRatio.tone ? ' ' + frameRatio.tone : '');\n            }\n          }\n        }\n        if (accountPrimaryBtn) {\n          if (connected) {\n            accountPrimaryBtn.style.display = '';\n            accountPrimaryBtn.textContent = 'Open FigDex Web';\n            accountPrimaryBtn.dataset.action = 'open-web';\n          } else if (state.lastIndexUpgradeUrl || state.lastIndexErrorCode === 'GUEST_FILE_LIMIT' || state.lastIndexErrorCode === 'GUEST_FRAME_LIMIT' || state.lastIndexErrorCode === 'FILE_LIMIT_REACHED' || state.lastIndexErrorCode === 'FRAME_LIMIT_REACHED') {\n            accountPrimaryBtn.style.display = '';\n            accountPrimaryBtn.textContent = getConnectedPlanLabel(model.identity) === 'Guest' ? 'Create free account' : 'Upgrade to Pro';\n            accountPrimaryBtn.dataset.action = 'upgrade';\n          } else if (state.authExpiredMessage) {\n            accountPrimaryBtn.style.display = '';\n            accountPrimaryBtn.textContent = 'Reconnect';\n            accountPrimaryBtn.dataset.action = 'connect';\n          } else {\n            accountPrimaryBtn.style.display = '';\n            accountPrimaryBtn.textContent = 'Connect to FigDex';\n            accountPrimaryBtn.dataset.action = 'connect';\n          }\n        }\n        if (currentFileBadge) {\n          currentFileBadge.textContent = fileSummary.badge;\n          currentFileBadge.style.background = fileSummary.badgeBg;\n          currentFileBadge.style.color = fileSummary.badgeColor;\n        }\n        if (currentFileStatusLine) currentFileStatusLine.textContent = fileSummary.detail;\n        if (actionStatusTitle) actionStatusTitle.textContent = primaryAction.title;\n        if (advanceBtn) {\n          var isErrorState = ctrlState === 'ERROR';\n          advanceBtn.style.display = isErrorState ? 'none' : '';\n          if (!isErrorState) {\n            advanceBtn.disabled = !!primaryAction.disabled || primaryAction.action !== 'index';\n            advanceBtn.textContent = primaryAction.button;\n          }\n        }\n        var selectionLoadSummary = getSelectionLoadSummary(model.pages || [], model.selectedPages || []);\n        var selectedCountEl = document.getElementById('selectedPagesCount');\n        if (selectedCountEl) {\n          var selectedCountText = (model.selectedPages || []).length + ' pages selected';\n          if (selectionLoadSummary && selectionLoadSummary.pageCount > 0) selectedCountText += ' • ' + selectionLoadSummary.label + ' load';\n          if (selectionLoadSummary && selectionLoadSummary.hasImplicitCover) selectedCountText += ' • cover included';\n          selectedCountEl.textContent = selectedCountText;\n        }\n        if (pagesSummaryChips) {\n          var chips = [];\n          if (pagesSummary.selectable > 0) {\n            chips.push('<span class=\"pages-summary-chip\">' + pagesSummary.selectable + ' available</span>');\n            if (pagesSummary.fresh > 0) chips.push('<span class=\"pages-summary-chip\">' + pagesSummary.fresh + ' new</span>');\n            if (pagesSummary.updating > 0) chips.push('<span class=\"pages-summary-chip\">' + pagesSummary.updating + ' need update</span>');\n            if (pagesSummary.indexed > 0) chips.push('<span class=\"pages-summary-chip\">' + pagesSummary.indexed + ' indexed</span>');\n          }\n          if (selectionLoadSummary && selectionLoadSummary.pageCount > 0) chips.push(buildSelectionLoadChip(selectionLoadSummary));\n          pagesSummaryChips.innerHTML = chips.join('');\n        }\n        if (selectAllPagesBtn) {\n          selectAllPagesBtn.disabled = !pagesSummary.selectable;\n        }\n        if (clearPagesBtn) {\n          clearPagesBtn.disabled = !(model.selectedPages || []).length;\n        }\n        var indexOutcomeHintEl = document.getElementById('indexOutcomeHint');\n        if (indexOutcomeHintEl) {\n          var showHint = ctrlState !== 'ERROR';\n          indexOutcomeHintEl.style.display = showHint ? 'block' : 'none';\n          if (showHint) indexOutcomeHintEl.textContent = primaryAction.detail;\n        }\n        var pageListHelperEl = document.getElementById('pageListHelperText');\n        if (pageListHelperEl) {\n          var noPagesSelected = (model.selectedPages || []).length === 0;\n          var showNoSelectionHint = ctrlState === 'READY_TO_INDEX' && model.fileKey && model.pages && model.pages.length > 0 && noPagesSelected;\n          var showIncludeHint = ctrlState === 'READY_TO_INDEX' && model.fileKey && model.identity && model.identity.exists && currentFileHasIndexedPages(model.pages) && !noPagesSelected;\n          var showLoadWarning = ctrlState === 'READY_TO_INDEX' && !noPagesSelected && selectionLoadSummary && selectionLoadSummary.tone !== 'safe';\n          pageListHelperEl.style.display = (showNoSelectionHint || showIncludeHint || showLoadWarning) ? 'block' : 'none';\n          pageListHelperEl.style.color = showLoadWarning && selectionLoadSummary.tone === 'danger' ? '#b42318' : (showLoadWarning ? '#b45309' : '#666');\n          if (showNoSelectionHint) pageListHelperEl.textContent = 'Select at least one page to update the index.';\n          else if (showLoadWarning && selectionLoadSummary.tone === 'danger') pageListHelperEl.textContent = 'This selection is too large for one stable run. Split it into smaller batches.';\n          else if (showLoadWarning) pageListHelperEl.textContent = 'This selection is heavy. It should run, but smaller batches will be more stable.';\n          else if (showIncludeHint) pageListHelperEl.textContent = 'Select the pages you want to include in the updated index.';\n        }\n        var openGalleryFromPagesBtn = document.getElementById('openGalleryFromPagesBtn');\n        if (openGalleryFromPagesBtn) {\n          var isDone = ctrlState === 'DONE';\n          var connected = model.identity && model.identity.exists;\n          var hasUserId = model.identity && model.identity.userId;\n          var showOpenWeb = isDone || (connected && (hasUserId || (state.hasEverCompletedIndex === true)));\n          var parentDiv = openGalleryFromPagesBtn.parentElement;\n          if (parentDiv) parentDiv.style.display = showOpenWeb ? 'block' : 'none';\n        }\n        var needsConnect = ctrlState === 'NEEDS_CONNECT';\n        var isIndexing = ctrlState === 'INDEXING';\n        var isDone = ctrlState === 'DONE';\n        var needsBlock = document.getElementById('needsConnectBlock');\n        var actionCard = document.getElementById('actionCard');\n        var indexingBlock = document.getElementById('indexingBlock');\n        var doneBlock = document.getElementById('doneBlock');\n        var doneMsgEl = document.getElementById('doneMsg');\n        var connectTimeoutBlock = document.getElementById('connectTimeoutBlock');\n        if (needsBlock) {\n          needsBlock.style.display = (needsConnect && !state.connectTimedOut) ? 'block' : 'none';\n          var needsMsg = document.getElementById('needsConnectMessage');\n          if (needsMsg) needsMsg.textContent = state.authExpiredMessage ? (state.authExpiredMessage + ' Please reconnect below.') : 'Connect your FigDex account to create an index.';\n        }\n        if (connectTimeoutBlock) connectTimeoutBlock.style.display = (needsConnect && state.connectTimedOut) ? 'block' : 'none';\n        if (actionCard) actionCard.style.display = (needsConnect || isIndexing || isDone) ? 'none' : 'block';\n        var openGalleryFromPagesWrap = document.getElementById('openGalleryFromPagesWrap');\n        if (openGalleryFromPagesWrap) openGalleryFromPagesWrap.style.display = 'none';\n        if (indexingBlock) {\n          indexingBlock.style.display = isIndexing ? 'block' : 'none';\n          var indexingTextEl = document.getElementById('indexingBlockText');\n          var indexingSubEl = document.getElementById('indexingBlockSubtext');\n          var indexingHintEl = document.getElementById('indexingBlockHint');\n          var indexingStageEl = document.getElementById('indexingBlockStage');\n          if (isIndexing) {\n            var indexingPresentation = getIndexingPresentation(state.indexingStatusText);\n            if (indexingTextEl) indexingTextEl.textContent = state.indexingStatusText || 'Updating index…';\n            if (indexingSubEl) {\n              indexingSubEl.style.display = 'block';\n              indexingSubEl.textContent = indexingPresentation.detail;\n            }\n            if (indexingStageEl) indexingStageEl.textContent = indexingPresentation.stage;\n          } else {\n            if (indexingSubEl) indexingSubEl.style.display = 'none';\n          }\n          if (indexingHintEl) {\n            var isSlow = false;\n            if (isIndexing && state.indexingStartedAt) {\n              var nowTs = Date.now();\n              var sinceStart = nowTs - state.indexingStartedAt;\n              var sinceProgress = state.indexingLastProgressAt ? (nowTs - state.indexingLastProgressAt) : sinceStart;\n              isSlow = sinceStart > 15000 && sinceProgress > 8000;\n            }\n            indexingHintEl.style.display = isSlow ? 'block' : 'none';\n          }\n        }\n        if (doneBlock) doneBlock.style.display = isDone ? 'block' : 'none';\n        var doneTitleEl = document.getElementById('doneBlockTitle');\n        var doneSubEl = document.getElementById('doneBlockSubtitle');\n        if (doneTitleEl) doneTitleEl.textContent = 'Index updated successfully';\n        if (doneSubEl) doneSubEl.textContent = 'Your gallery has been updated.';\n        if (doneMsgEl) doneMsgEl.style.display = 'none';\n        var isError = ctrlState === 'ERROR';\n        var indexErrorBlock = document.getElementById('indexErrorBlock');\n        var indexErrorText = document.getElementById('indexErrorText');\n        var indexErrorActionBtn = document.getElementById('indexErrorActionBtn');\n        if (indexErrorBlock) indexErrorBlock.style.display = isError ? 'block' : 'none';\n        if (isError) {\n          var errMsg = state.lastIndexError || 'Something went wrong.';\n          var isAuthError = state.authExpiredMessage === 'Session expired' || (errMsg && (errMsg.indexOf('Session expired') >= 0 || errMsg.indexOf('Connect your FigDex') >= 0));\n          var isGuestLimit = state.lastIndexErrorCode === 'GUEST_FILE_LIMIT' || state.lastIndexErrorCode === 'GUEST_FRAME_LIMIT' || state.lastIndexErrorCode === 'FILE_LIMIT_REACHED' || state.lastIndexErrorCode === 'FRAME_LIMIT_REACHED';\n          var isGuestPlan = getConnectedPlanLabel(model.identity) === 'Guest';\n          if (indexErrorText) indexErrorText.textContent = errMsg;\n          if (indexErrorActionBtn) {\n            indexErrorActionBtn.textContent = isAuthError ? 'Continue on Web' : (isGuestLimit ? (isGuestPlan ? 'Create free account' : 'Upgrade to Pro') : 'Try again');\n            indexErrorActionBtn._figdexErrorIsAuth = isAuthError;\n            indexErrorActionBtn._figdexUpgradeUrl = state.lastIndexUpgradeUrl || null;\n          }\n        }\n        var errorMsgEl = document.getElementById('errorMsg');\n        if (errorMsgEl) errorMsgEl.style.display = 'none';\n        if (!isError && state.lastIndexError) state.lastIndexError = '';\n      }\n      window.render = render;\n\n      function sendIntent(type, payload) {\n        payload = payload || {};\n        window.parent.postMessage({ pluginMessage: Object.assign({ type: type }, payload) }, '*');\n      }\n      function notifyStateChange(newState) {\n        var model = { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null };\n        window.parent.postMessage({ pluginMessage: { type: 'UI_STATE_CHANGED', state: newState, model: model } }, '*');\n      }\n\n      function __figdexOnCreateIndexClick() {\n        var btn = document.getElementById('advanceBtn');\n        if (btn && btn.disabled) {\n          return;\n        }\n        var ctrl = window.__figdexFlowController || controller;\n        if (ctrl && ctrl.getState && ctrl.getState() === 'INDEXING') {\n          return;\n        }\n        if (!ctrl) {\n          return;\n        }\n        if (!controller && ctrl === window.__figdexFlowController) {\n          var idStore = window.__figdexIdentityStore;\n          var tel = window.__figdexTelemetry;\n          if (idStore && tel) {\n            controller = ctrl;\n            ctrl.init({\n              identityStore: idStore,\n              telemetry: tel,\n              trace: false,\n              onOpenWeb: function() { window.open('https://www.figdex.com/login?from=figma-plugin', 'figdex_web', 'width=1200,height=800'); },\n              onRunIndexing: function(selectedPages) {\n                sendIntent('start-advanced', { selectedPages: selectedPages || state.selectedPages });\n              },\n              onStateChange: notifyStateChange\n            });\n            ctrl.dispatch('identity_loaded');\n          }\n        }\n        if (telemetry && telemetry.track) telemetry.track('index_click', buildTelemetryContext());\n        ctrl.dispatch('UI_CREATE_INDEX_CLICKED', { selectedPages: state.selectedPages || [] });\n        var model = { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null };\n        render(state, model);\n      }\n      window.__figdexOnCreateIndexClick = __figdexOnCreateIndexClick;\n\n      function getStatusIcon(page) {\n        if (!page) return '';\n        if (page.isCoverPage) return '';\n        var title = '';\n        if (page.status === 'up_to_date') title = 'Page up to date';\n        else if (page.status === 'needs_update') title = 'Page needs update';\n        else if (page.status === 'not_indexed') title = 'Not in index';\n        else if (page.status === 'folder') title = 'Folder';\n        else if (page.status === 'index_page') title = 'Index page';\n        else if (page.isIndexPage) title = 'Index page';\n        else if (page.hasFrames === false) title = 'No frames';\n        else title = 'Page';\n        var icon = (page.icon != null && page.icon !== '') ? page.icon : (page.hasFrames !== false ? '\\u2795' : '\\uD83D\\uDCC1');\n        return '<span class=\"page-row-icon\" title=\"' + (title.replace(/\"/g, '&quot;')) + '\">' + icon + '</span>';\n      }\n\n      function updateToggleSelectCheckbox(pages) {\n        var mainCheckbox = document.getElementById('toggleSelectCheckbox');\n        if (!mainCheckbox) return;\n        var list = pages || state.pages || [];\n        var total = list.filter(function(p) { return p.hasFrames !== false && !p.isIndexPage && !p.isCoverPage; }).length;\n        var selected = (state.selectedPages || []).length;\n        if (selected === 0) {\n          mainCheckbox.checked = false;\n          mainCheckbox.indeterminate = false;\n        } else if (selected === total && total > 0) {\n          mainCheckbox.checked = true;\n          mainCheckbox.indeterminate = false;\n        } else {\n          mainCheckbox.checked = false;\n          mainCheckbox.indeterminate = true;\n        }\n      }\n\n      function renderPagesListContent(pages) {\n        var listDiv = document.getElementById('pagesList');\n        if (!listDiv) return;\n        listDiv.innerHTML = '';\n        (pages || []).forEach(function(page, i) {\n          var id = 'page_' + i;\n          var hasFrames = page.hasFrames !== false;\n          var isIndexPage = page.isIndexPage === true;\n          var isCoverPage = page.isCoverPage === true;\n          var selectable = hasFrames && !isIndexPage && !isCoverPage;\n          var removable = page && (page.status === 'up_to_date' || page.status === 'needs_update');\n          var checked = state.selectedPages.indexOf(page.id) !== -1 ? 'checked' : '';\n          var label = document.createElement('label');\n          var iconHtml = getStatusIcon(page);\n          label.innerHTML = '<div class=\"page-row-left\">' +\n            '<input type=\"checkbox\" id=\"' + id + '\" data-page-id=\"' + page.id + '\" ' + (selectable ? checked : 'disabled') + ' style=\"margin-right: 8px;\">' +\n            '<span style=\"font-size: 0.8em;\">' + (page.displayName || page.name || '') + '</span>' +\n            '</div>' +\n            '<div style=\"display:flex; align-items:center; gap:6px; flex-shrink:0;\">' +\n            (removable ? '<button type=\"button\" class=\"pages-action-btn\" data-remove-page-id=\"' + page.id + '\" style=\"font-size:0.62em; color:#c62828; border-color:#ef9a9a;\">Remove</button>' : '') +\n            iconHtml +\n            '</div>';\n          var input = label.querySelector('input');\n          if (input) {\n            input.addEventListener('change', function() {\n              var pid = this.getAttribute('data-page-id');\n              if (this.checked) { if (state.selectedPages.indexOf(pid) === -1) state.selectedPages.push(pid); }\n              else state.selectedPages = state.selectedPages.filter(function(p) { return p !== pid; });\n              sendIntent('save-selected-pages', { pages: state.selectedPages });\n              var countEl = document.getElementById('selectedPagesCount');\n              if (countEl) countEl.textContent = state.selectedPages.length + ' pages selected';\n              updateToggleSelectCheckbox(state.pages);\n              var model = { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null };\n              if (typeof render === 'function') render(state, model);\n            });\n          }\n          var removeBtn = label.querySelector('[data-remove-page-id]');\n          if (removeBtn) {\n            removeBtn.addEventListener('click', function(event) {\n              event.preventDefault();\n              event.stopPropagation();\n              var pid = this.getAttribute('data-remove-page-id');\n              var pageLabel = page.displayName || page.name || 'this page';\n              var confirmed = window.confirm('Remove the indexed copy of \"' + pageLabel + '\" from FigDex?');\n              if (!confirmed) return;\n              sendIntent('remove-indexed-page', { pageId: pid, pageName: pageLabel });\n            });\n          }\n          listDiv.appendChild(label);\n        });\n        updateToggleSelectCheckbox(pages);\n      }\n\n      function init() {\n        if (window.__figdex_ui_inited) return;\n        window.__figdex_ui_inited = true;\n        var saveBtn = document.getElementById('fileKeyInlineSaveBtn');\n        var saveInput = document.getElementById('fileKeyInlineInput');\n        if (saveBtn && saveInput) {\n          saveBtn.addEventListener('click', function() { state.step1Expanded = false; onSaveFileKeyClick(); });\n        }\n        var changeLinkBtn = document.getElementById('fileKeyChangeLinkBtn');\n        if (changeLinkBtn) {\n          changeLinkBtn.addEventListener('click', function() {\n            state.step1Expanded = true;\n            render(state, { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null });\n          });\n        }\n        var advanceBtn = document.getElementById('advanceBtn');\n        if (advanceBtn) advanceBtn.addEventListener('click', __figdexOnCreateIndexClick);\n        var toggleSelectCheckbox = document.getElementById('toggleSelectCheckbox');\n        if (toggleSelectCheckbox) {\n          toggleSelectCheckbox.addEventListener('change', function() {\n            var checked = this.checked;\n            if (checked) {\n              state.selectedPages = (state.pages || []).filter(function(p) { return p.hasFrames !== false && !p.isIndexPage && !p.isCoverPage; }).map(function(p) { return p.id; });\n            } else {\n              state.selectedPages = [];\n            }\n            sendIntent('save-selected-pages', { pages: state.selectedPages });\n            var countEl = document.getElementById('selectedPagesCount');\n            if (countEl) countEl.textContent = state.selectedPages.length + ' pages selected';\n            updateToggleSelectCheckbox(state.pages);\n            var model = { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null };\n            if (typeof render === 'function') render(state, model);\n          });\n        }\n        var selectAllPagesBtn = document.getElementById('selectAllPagesBtn');\n        if (selectAllPagesBtn) {\n          selectAllPagesBtn.addEventListener('click', function() {\n            state.selectedPages = (state.pages || []).filter(function(p) {\n              return p && p.hasFrames !== false && !p.isIndexPage && !p.isCoverPage;\n            }).map(function(p) { return p.id; });\n            sendIntent('save-selected-pages', { pages: state.selectedPages });\n            var model = { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null };\n            render(state, model);\n          });\n        }\n        var clearPagesBtn = document.getElementById('clearPagesBtn');\n        if (clearPagesBtn) {\n          clearPagesBtn.addEventListener('click', function() {\n            state.selectedPages = [];\n            sendIntent('save-selected-pages', { pages: state.selectedPages });\n            var model = { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null };\n            render(state, model);\n          });\n        }\n        var refreshPagesBtn = document.getElementById('refreshPagesBtn');\n        if (refreshPagesBtn) {\n          refreshPagesBtn.addEventListener('click', function() {\n            sendIntent('refresh-pages');\n          });\n        }\n        function openSettingsDrawer() {\n          var overlay = document.getElementById('settingsOverlay');\n          var drawer = document.getElementById('settingsDrawer');\n          if (overlay && drawer) {\n            overlay.style.display = 'block';\n            drawer.style.display = 'block';\n            drawer.style.transform = 'translateY(100%)';\n            requestAnimationFrame(function() {\n              drawer.style.transition = 'transform 0.3s ease-out';\n              drawer.style.transform = 'translateY(0)';\n            });\n          }\n        }\n        function closeSettingsDrawer() {\n          var overlay = document.getElementById('settingsOverlay');\n          var drawer = document.getElementById('settingsDrawer');\n          if (overlay && drawer) {\n            drawer.style.transform = 'translateY(100%)';\n            setTimeout(function() {\n              overlay.style.display = 'none';\n              drawer.style.display = 'none';\n            }, 300);\n          }\n        }\n        var settingsIconBtn = document.getElementById('settingsIconBtn');\n        if (settingsIconBtn) {\n          settingsIconBtn.addEventListener('click', function() { openSettingsDrawer(); });\n        }\n        var closeSettingsDrawerBtn = document.getElementById('closeSettingsDrawerBtn');\n        if (closeSettingsDrawerBtn) {\n          closeSettingsDrawerBtn.addEventListener('click', function() { closeSettingsDrawer(); });\n        }\n        var settingsOverlay = document.getElementById('settingsOverlay');\n        if (settingsOverlay) {\n          settingsOverlay.addEventListener('click', function() { closeSettingsDrawer(); });\n        }\n        window.__figdexCloseSettingsDrawer = closeSettingsDrawer;\n        var openFigdexWebBtn = document.getElementById('openFigdexWebBtn');\n        if (openFigdexWebBtn) {\n          openFigdexWebBtn.addEventListener('click', function() { sendIntent('UI_OPEN_FIGDEX_WEB'); });\n        }\n        function buildGalleryUrl() {\n          var base = 'https://www.figdex.com/gallery';\n          var params = [];\n          if (state.fileKey) params.push('fileKey=' + encodeURIComponent(state.fileKey));\n          var id = identityStore ? identityStore.getIdentity() : null;\n          if (id && id.token) params.push('apiKey=' + encodeURIComponent(id.token));\n          return params.length ? base + '?' + params.join('&') : base;\n        }\n        var openGalleryFromPagesBtn = document.getElementById('openGalleryFromPagesBtn');\n        if (openGalleryFromPagesBtn) {\n          openGalleryFromPagesBtn.addEventListener('click', function() {\n            window.open(buildGalleryUrl(), 'figdex_web', 'width=1200,height=800');\n          });\n        }\n        var accountPrimaryBtn = document.getElementById('accountPrimaryBtn');\n        if (accountPrimaryBtn) {\n          accountPrimaryBtn.addEventListener('click', function() {\n            var action = accountPrimaryBtn.dataset.action || 'connect';\n            if (action === 'open-web') {\n              window.open(buildGalleryUrl(), 'figdex_web', 'width=1200,height=800');\n            } else if (action === 'upgrade') {\n              sendIntent('UI_OPEN_FIGDEX_WEB_UPGRADE');\n            } else {\n              sendIntent('UI_OPEN_FIGDEX_WEB');\n            }\n          });\n        }\n        var connectTimeoutRetryBtn = document.getElementById('connectTimeoutRetryBtn');\n        if (connectTimeoutRetryBtn) {\n          connectTimeoutRetryBtn.addEventListener('click', function() {\n            state.connectTimedOut = false;\n            sendIntent('UI_OPEN_FIGDEX_WEB');\n            var model = { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null };\n            render(state, model);\n          });\n        }\n        var connectTimeoutCancelBtn = document.getElementById('connectTimeoutCancelBtn');\n        if (connectTimeoutCancelBtn) {\n          connectTimeoutCancelBtn.addEventListener('click', function() {\n            state.connectTimedOut = false;\n            if (controller && controller.dispatch) {\n              controller.dispatch('reset');\n              if (typeof notifyStateChange === 'function') notifyStateChange(controller.getState());\n              var model = { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null };\n              render(state, model);\n            }\n          });\n        }\n        var doneOpenWebBtn = document.getElementById('doneOpenWebBtn');\n        if (doneOpenWebBtn) {\n          doneOpenWebBtn.addEventListener('click', function() {\n            if (telemetry && telemetry.track) telemetry.track('open_gallery', buildTelemetryContext());\n            if (state.resultUrl) {\n              sendIntent('UI_OPEN_RESULT_WEB', { resultUrl: state.resultUrl });\n            } else if (controller && controller.getState && controller.getState() === 'DONE') {\n              sendIntent('UI_OPEN_RESULT_WEB', { resultUrl: typeof buildGalleryUrl === 'function' ? buildGalleryUrl() : (state.fileKey ? ('https://www.figdex.com/gallery?fileKey=' + encodeURIComponent(state.fileKey)) : 'https://www.figdex.com/gallery') });\n            } else {\n              if (typeof openWebLogin === 'function') openWebLogin();\n            }\n          });\n        }\n        var doneUpdateAgainBtn = document.getElementById('doneUpdateAgainBtn');\n        if (doneUpdateAgainBtn) {\n          doneUpdateAgainBtn.addEventListener('click', function() {\n            if (controller && controller.dispatch) {\n              controller.dispatch('reset');\n              if (typeof notifyStateChange === 'function') notifyStateChange(controller.getState());\n              var model = { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null };\n              render(state, model);\n            }\n          });\n        }\n        var indexErrorActionBtn = document.getElementById('indexErrorActionBtn');\n        if (indexErrorActionBtn) {\n          indexErrorActionBtn.addEventListener('click', function() {\n            if (this._figdexErrorIsAuth) {\n              sendIntent('UI_OPEN_FIGDEX_WEB');\n            } else if (this._figdexUpgradeUrl) {\n              sendIntent('UI_OPEN_FIGDEX_WEB_UPGRADE');\n            } else {\n              var ctrl = controller || window.__figdexFlowController;\n              if (ctrl && ctrl.dispatch) {\n                ctrl.dispatch('reset');\n                if (typeof notifyStateChange === 'function') notifyStateChange(ctrl.getState());\n                var model = { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null };\n                render(state, model);\n              }\n            }\n          });\n        }\n        var ctrl = window.__figdexFlowController;\n        var idStore = window.__figdexIdentityStore;\n        var tel = window.__figdexTelemetry;\n        if (!tel || !idStore || !ctrl) return;\n        telemetry = tel;\n        identityStore = idStore;\n        controller = ctrl;\n        controller.init({\n          identityStore: identityStore,\n          telemetry: telemetry,\n          trace: false,\n          onTrack: function(ev) { if (telemetry && telemetry.track) telemetry.track(ev, buildTelemetryContext()); },\n          onOpenWeb: function() { window.open('https://www.figdex.com/login?from=figma-plugin', 'figdex_web', 'width=1200,height=800'); },\n          onRunIndexing: function(selectedPages) {\n            sendIntent('start-advanced', { selectedPages: selectedPages || state.selectedPages });\n          },\n          onStateChange: notifyStateChange\n        });\n        if (state.identityPending) {\n          if (state.identityPending.token && state.identityPending.user) identityStore.setIdentity(state.identityPending.token, state.identityPending.user);\n          else identityStore.clearIdentity();\n          state.identityPending = null;\n        }\n        controller.dispatch('identity_loaded');\n        var model = { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore.getIdentity() };\n        render(state, model);\n        sendIntent('refresh-pages');\n        sendIntent('get-has-ever-indexed');\n      }\n\n      function formatIndexingDuration(ms) {\n        if (typeof ms !== 'number' || !isFinite(ms) || ms <= 0) return '';\n        var totalSeconds = Math.max(1, Math.round(ms / 1000));\n        var hours = Math.floor(totalSeconds / 3600);\n        var minutes = Math.floor((totalSeconds % 3600) / 60);\n        var seconds = totalSeconds % 60;\n        if (hours > 0) return hours + 'h ' + minutes + 'm';\n        if (minutes > 0) return minutes + 'm ' + seconds + 's';\n        return seconds + 's';\n      }\n\n      function getIndexingProgressRatio(payload) {\n        if (payload && typeof payload.progressRatio === 'number' && isFinite(payload.progressRatio)) {\n          return Math.max(0, Math.min(1, payload.progressRatio));\n        }\n        if (payload && typeof payload.framesDone === 'number' && typeof payload.totalFrames === 'number' && payload.totalFrames > 0) {\n          return Math.max(0, Math.min(1, payload.framesDone / payload.totalFrames));\n        }\n        if (payload && typeof payload.pagesDone === 'number' && typeof payload.totalPages === 'number' && payload.totalPages > 0) {\n          return Math.max(0, Math.min(1, payload.pagesDone / payload.totalPages));\n        }\n        return null;\n      }\n\n      function simplifyIndexingStep(step) {\n        var label = typeof step === 'string' ? step.toLowerCase() : '';\n        if (!label) return 'Updating index…';\n        if (label.indexOf('retry') >= 0) return 'Retrying upload…';\n        if (label.indexOf('prepar') >= 0) return 'Preparing export…';\n        if (label.indexOf('scan') >= 0) return 'Scanning pages…';\n        if (label.indexOf('found ') >= 0) return 'Preparing changed pages…';\n        if (label.indexOf('export') >= 0) return 'Exporting assets…';\n        if (label.indexOf('upload') >= 0) return 'Uploading assets…';\n        if (label.indexOf('complete') >= 0 || label.indexOf('final') >= 0) return 'Finalizing index…';\n        if (label.indexOf('no page changes') >= 0) return 'No changes detected';\n        return 'Updating index…';\n      }\n\n      function getSelectionLoadSummary(pages, selectedPages) {\n        var pageList = Array.isArray(pages) ? pages : [];\n        var selected = Array.isArray(selectedPages) ? selectedPages.slice(0) : [];\n        var pageMap = {};\n        for (var i = 0; i < pageList.length; i++) {\n          var page = pageList[i];\n          if (page && page.id) pageMap[page.id] = page;\n        }\n        var frameCounts = [];\n        var hasImplicitCover = false;\n        for (var si = 0; si < selected.length; si++) {\n          var selectedPage = pageMap[selected[si]];\n          if (!selectedPage || selectedPage.isIndexPage || !selectedPage.hasFrames) continue;\n          frameCounts.push(Math.max(0, Number(selectedPage.frameCount) || 0));\n        }\n        for (var pi = 0; pi < pageList.length; pi++) {\n          var candidate = pageList[pi];\n          if (!candidate || !candidate.isCoverPage || candidate.isIndexPage || !candidate.hasFrames) continue;\n          if (selected.indexOf(candidate.id) === -1) {\n            frameCounts.push(Math.max(0, Number(candidate.frameCount) || 0));\n            hasImplicitCover = true;\n          }\n          break;\n        }\n        var totalFrames = 0;\n        var maxPageFrames = 0;\n        for (var fi = 0; fi < frameCounts.length; fi++) {\n          var count = frameCounts[fi];\n          totalFrames += count;\n          if (count > maxPageFrames) maxPageFrames = count;\n        }\n        var score = totalFrames;\n        if (frameCounts.length > 6) score += (frameCounts.length - 6) * 4;\n        for (var ci = 0; ci < frameCounts.length; ci++) {\n          var frameCount = frameCounts[ci];\n          if (frameCount > 24) score += 8;\n          if (frameCount > 48) score += 16;\n          if (frameCount > 80) score += 24;\n        }\n        var tone = 'safe';\n        var label = 'Safe';\n        if (score >= 180 || frameCounts.length >= 16 || maxPageFrames >= 120) {\n          tone = 'danger';\n          label = 'Too large';\n        } else if (score >= 75 || frameCounts.length >= 8 || maxPageFrames >= 72) {\n          tone = 'warn';\n          label = 'Heavy';\n        }\n        return {\n          tone: tone,\n          label: label,\n          score: score,\n          pageCount: frameCounts.length,\n          totalFrames: totalFrames,\n          maxPageFrames: maxPageFrames,\n          hasImplicitCover: hasImplicitCover\n        };\n      }\n\n      function buildSelectionLoadChip(summary) {\n        if (!summary) return '';\n        var style = 'color:#516071;border-color:#e3e8ef;background:#fff;';\n        if (summary.tone === 'warn') style = 'color:#b45309;border-color:#f3d19c;background:#fff7ed;';\n        if (summary.tone === 'danger') style = 'color:#b42318;border-color:#f4b4ae;background:#fff1f0;';\n        return '<span class=\"pages-summary-chip\" style=\"' + style + '\">Load: ' + summary.label + '</span>';\n      }\n\n      function updateIndexingProgressUI() {\n        var overallWrap = document.getElementById('overallProgressContainer');\n        var runningWrap = document.getElementById('runningProgressBarContainer');\n        var indexingBlockBarWrap = document.getElementById('indexingBlockProgressWrap');\n        var indexingBlockBar = document.getElementById('indexingBlockProgressBar');\n        var indexingBlockPct = document.getElementById('indexingBlockProgressPct');\n        var indexingBlockMeta = document.getElementById('indexingBlockProgressMeta');\n        var ratio = getIndexingProgressRatio(state);\n        var elapsedMs = typeof state.indexingElapsedMs === 'number' && isFinite(state.indexingElapsedMs) ? state.indexingElapsedMs : null;\n        if ((elapsedMs === null || elapsedMs < 0) && state.indexingStartedAt) elapsedMs = Date.now() - state.indexingStartedAt;\n        var etaMs = typeof state.indexingEtaMs === 'number' && isFinite(state.indexingEtaMs) ? state.indexingEtaMs : null;\n        var totalMs = (elapsedMs !== null && etaMs !== null) ? (elapsedMs + etaMs) : null;\n        var progressStatusText = document.getElementById('progressStatusText');\n        var progressDetails = document.getElementById('progressDetails');\n        var indexingText = document.getElementById('indexingBlockText');\n        var indexingSubtext = document.getElementById('indexingBlockSubtext');\n        var indexingHint = document.getElementById('indexingBlockHint');\n        var isActive = !!state.indexingStartedAt || (typeof ratio === 'number' && ratio > 0 && ratio < 1);\n        if (overallWrap) overallWrap.style.display = 'none';\n        if (runningWrap) runningWrap.style.display = 'none';\n        if (progressStatusText) progressStatusText.textContent = state.indexingStatusText || 'Updating index…';\n        if (!isActive) {\n          if (indexingBlockBarWrap) indexingBlockBarWrap.style.display = 'none';\n          if (indexingBlockBar) indexingBlockBar.style.width = '0%';\n          if (indexingBlockPct) indexingBlockPct.textContent = '';\n          if (indexingBlockMeta) indexingBlockMeta.textContent = '';\n          if (progressDetails) progressDetails.textContent = '';\n          if (indexingSubtext) indexingSubtext.textContent = 'Your existing gallery is being updated with the selected pages.';\n          if (indexingHint) indexingHint.style.display = 'none';\n          return;\n        }\n        var safeRatio = typeof ratio === 'number' ? Math.max(0, Math.min(1, ratio)) : 0;\n        var percent = Math.round(safeRatio * 100);\n        if (indexingBlockBarWrap) indexingBlockBarWrap.style.display = 'block';\n        if (indexingBlockBar) indexingBlockBar.style.width = percent + '%';\n        if (indexingBlockPct) indexingBlockPct.textContent = percent + '%';\n        var metaParts = [];\n        if (elapsedMs !== null) metaParts.push('Elapsed ' + formatIndexingDuration(elapsedMs));\n        if (totalMs !== null) metaParts.push('Total ~' + formatIndexingDuration(totalMs));\n        else if (etaMs !== null) metaParts.push('Left ~' + formatIndexingDuration(etaMs));\n        var metaText = metaParts.join(' • ');\n        if (indexingBlockMeta) indexingBlockMeta.textContent = metaText;\n        if (progressDetails) progressDetails.textContent = metaText;\n        if (indexingText) indexingText.textContent = state.indexingStatusText || 'Updating index…';\n        if (indexingSubtext) indexingSubtext.textContent = 'Overall progress across all selected pages.';\n        if (indexingHint) {\n          var showHint = (elapsedMs !== null && elapsedMs > 120000) || (etaMs !== null && etaMs > 120000);\n          indexingHint.style.display = showHint ? 'block' : 'none';\n        }\n      }\n\n      window.addEventListener('message', function(event) {\n        if (!event.data) return;\n        var msg = event.data.pluginMessage != null ? event.data.pluginMessage : event.data;\n        if (!msg || typeof msg !== 'object' || !msg.type) return;\n        if (msg.type === 'set-document-id') {\n          var newDocId = msg.documentId || null;\n          if (state.documentId && newDocId && state.documentId !== newDocId) {\n            // Document switched — clear file-specific state and refresh so new file's pages load\n            state.fileKey = '';\n            state.pages = [];\n            state.selectedPages = [];\n            forceClearUI();\n            sendIntent('get-file-key');\n            sendIntent('refresh-pages');\n          }\n          state.documentId = newDocId;\n        }\n        if (msg.type === 'UI_RENDER' && msg.payload) {\n          render(msg.payload.state, msg.payload.model);\n          return;\n        }\n        if (msg.type === 'set-file-key') {\n          state.fileKey = msg.fileKey || '';\n          if (!state.fileKey) {\n            forceClearUI();\n          } else {\n            sendIntent('refresh-pages');\n            sendIntent('get-file-thumbnail', { fileKey: state.fileKey });\n          }\n          render(state, { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null });\n        }\n        if (msg.type === 'plugin-version') {\n          state.pluginVersion = msg.version || '';\n          var telGlobal = window.__figdexTelemetry;\n          if (telGlobal && telGlobal.setPluginVersion) telGlobal.setPluginVersion(msg.version || '');\n          var pluginVersionLabel = document.getElementById('pluginVersionLabel');\n          if (pluginVersionLabel) pluginVersionLabel.textContent = msg.version || '';\n          var versionNodes = document.querySelectorAll('.menuVersionText');\n          for (var vi = 0; vi < versionNodes.length; vi++) {\n            versionNodes[vi].textContent = msg.version || '';\n          }\n        }\n        if (msg.type === 'TELEMETRY_ANON_ID' && msg.anonId) {\n          var telG = window.__figdexTelemetry;\n          if (telG && telG.setAnonId) telG.setAnonId(msg.anonId);\n          if (telG && telG.track && !state._telemetryBootSent) {\n            state._telemetryBootSent = true;\n            telG.track('plugin_boot', buildTelemetryContext());\n          }\n        }\n        if (msg.type === 'HAS_EVER_INDEXED') {\n          state.hasEverCompletedIndex = !!msg.hasEverCompletedIndex;\n          render(state, { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null });\n          return;\n        }\n        if (msg.type === 'set-selected-pages') {\n          state.selectedPages = Array.isArray(msg.pages) ? msg.pages.slice(0, 500) : [];\n          var countEl0 = document.getElementById('selectedPagesCount');\n          if (countEl0) countEl0.textContent = state.selectedPages.length + ' pages selected';\n          render(state, { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null });\n          return;\n        }\n        if (msg.type === 'pages-indexed' && Array.isArray(msg.pageIds)) {\n          var ids = msg.pageIds;\n          if (Array.isArray(state.pages)) {\n            state.pages = state.pages.map(function(p) {\n              if (ids.indexOf(p.id) !== -1 && p.hasFrames !== false && !p.isIndexPage && !p.isCoverPage) {\n                p.status = 'up_to_date';\n                p.icon = '✅';\n              }\n              return p;\n            });\n          }\n          render(state, { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null });\n          return;\n        }\n        if (msg.type === 'WEB_ACCOUNT_DATA_LOADED') {\n          var token = msg.token || (msg.payload && msg.payload.token);\n          var user = msg.user || (msg.payload && msg.payload.userId);\n          if (typeof user === 'string') user = { id: user };\n          var idStore = identityStore || window.__figdexIdentityStore;\n          var ctrl = controller || window.__figdexFlowController;\n          if (!token || !user) {\n            if (idStore) idStore.clearIdentity();\n            state.identityPending = null;\n            state.accountLimits = null;\n            state.authExpiredMessage = '';\n            if (ctrl) ctrl.dispatch('identity_loaded');\n            render(state, { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: null });\n            return;\n          }\n          state.identityPending = { token: token, user: user };\n          if (idStore) idStore.setIdentity(token, user);\n          state.connectTimedOut = false;\n          state.authExpiredMessage = '';\n          state.lastIndexError = '';\n          state.lastIndexErrorCode = null;\n          state.lastIndexUpgradeUrl = null;\n          if (ctrl) {\n            if (ctrl.getState && ctrl.getState() === 'ERROR') {\n              ctrl.dispatch('reset');\n            }\n            if (token && user && ctrl.getState && ctrl.getState() === 'NEEDS_CONNECT') ctrl.dispatch('EVT_CONNECT_SUCCESS');\n            else ctrl.dispatch('identity_loaded');\n          }\n          sendIntent('get-has-ever-indexed');\n          sendIntent('get-file-key');\n          if (state.fileKey) {\n            sendIntent('refresh-pages');\n            sendIntent('get-file-thumbnail', { fileKey: state.fileKey });\n          }\n          render(state, { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: idStore ? idStore.getIdentity() : null });\n        }\n        if (msg.type === 'WEB_ACCOUNT_LIMITS_LOADED') {\n          state.accountLimits = msg.limits && typeof msg.limits === 'object' ? msg.limits : null;\n          render(state, { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null });\n          return;\n        }\n        if (msg.type === 'CONNECT_TIMEOUT') {\n          state.connectTimedOut = true;\n          if (telemetry) telemetry.log('connect_timeout');\n          if (telemetry && telemetry.track) telemetry.track('connect_timeout', buildTelemetryContext());\n          if (controller) controller.dispatch('connect_timeout');\n          var model = { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null };\n          render(state, model);\n        }\n        if (msg.type === 'AUTH_EXPIRED') {\n          if (identityStore) identityStore.clearIdentity();\n          state.authExpiredMessage = 'Session expired';\n          state.accountLimits = null;\n          if (controller) controller.dispatch('auth_expired', { selectedPages: msg.selectedPages || [] });\n          if (telemetry) telemetry.log('auth_expired');\n          if (telemetry && telemetry.track) telemetry.track('auth_expired', buildTelemetryContext());\n          var model = { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: null };\n          render(state, model);\n        }\n        if (msg.type === 'pages') {\n          state.pages = msg.pages || [];\n          if (Array.isArray(msg.selectedPageIds)) {\n            state.selectedPages = msg.selectedPageIds.slice(0, 500);\n          }\n          if (state.selectedPages.length === 0) {\n            state.selectedPages = state.pages.filter(function(p) { return p.hasFrames && !p.isIndexPage && !p.isCoverPage; }).map(function(p) { return p.id; });\n          }\n          var countEl = document.getElementById('selectedPagesCount');\n          if (countEl) countEl.textContent = state.selectedPages.length + ' pages selected';\n          var statusEl = document.getElementById('fileKeyInlineStatus');\n          if (statusEl) { statusEl.textContent = state.pages.length > 0 ? 'Loaded ' + state.pages.length + ' pages' : 'Saved!'; statusEl.style.color = '#43a047'; }\n          if (state.fileKey) sendIntent('get-file-thumbnail', { fileKey: state.fileKey });\n          render(state, { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null });\n        }\n        if (msg.type === 'file-thumbnail') {\n          var thumbContainer = document.getElementById('fileThumbnailContainer');\n          var thumbImg = document.getElementById('fileThumbnail');\n          if (thumbContainer && thumbImg) {\n            if (msg.thumbnailDataUrl) thumbImg.src = msg.thumbnailDataUrl;\n            thumbContainer.style.display = 'block';\n          }\n        }\n        if (msg.type === 'file-thumbnail-error') {\n          var thumbContainer = document.getElementById('fileThumbnailContainer');\n          if (thumbContainer) thumbContainer.style.display = 'none';\n        }\n        if (msg.type === 'OPEN_FIGDEX_WEB') {\n          window.open(msg.url || 'https://www.figdex.com/plugin-connect?from=figma-plugin', 'figdex_web', 'width=1200,height=800');\n        }\n        if (msg.type === 'upload-started') {\n          state.indexingStatusText = 'Preparing…';\n          state.indexingStartedAt = Date.now();\n          state.indexingLastProgressAt = Date.now();\n          state.indexingElapsedMs = 0;\n          state.indexingEtaMs = null;\n          state.indexingProgressRatio = 0;\n          state.framesDone = 0;\n          state.totalFrames = null;\n          state.pagesDone = 0;\n          state.totalPages = null;\n          var indexingText = document.getElementById('indexingBlockText');\n          if (indexingText) indexingText.textContent = state.indexingStatusText;\n          updateIndexingProgressUI();\n        }\n        if (msg.type === 'upload-progress') {\n          state.indexingStatusText = simplifyIndexingStep(msg.step);\n          state.indexingLastProgressAt = Date.now();\n          state.indexingElapsedMs = typeof msg.elapsedMs === 'number' ? msg.elapsedMs : state.indexingElapsedMs;\n          state.indexingEtaMs = typeof msg.etaMs === 'number' ? msg.etaMs : null;\n          state.indexingProgressRatio = getIndexingProgressRatio(msg);\n          state.framesDone = typeof msg.framesDone === 'number' ? msg.framesDone : state.framesDone;\n          state.totalFrames = typeof msg.totalFrames === 'number' ? msg.totalFrames : state.totalFrames;\n          state.pagesDone = typeof msg.pagesDone === 'number' ? msg.pagesDone : state.pagesDone;\n          state.totalPages = typeof msg.totalPages === 'number' ? msg.totalPages : state.totalPages;\n          var indexingText = document.getElementById('indexingBlockText');\n          if (indexingText) indexingText.textContent = state.indexingStatusText;\n          updateIndexingProgressUI();\n        }\n        if (msg.type === 'WEB_INDEX_CREATED') {\n          state.indexingStatusText = 'Index completed';\n          state.indexingStartedAt = 0;\n          state.indexingLastProgressAt = 0;\n          state.indexingElapsedMs = null;\n          state.indexingEtaMs = null;\n          state.indexingProgressRatio = 1;\n          state.resultUrl = msg.resultUrl || '';\n          state.hasEverCompletedIndex = true;\n          updateIndexingProgressUI();\n          if (controller) controller.dispatch('web_index_created', { resultUrl: state.resultUrl });\n          render(state, { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null });\n        }\n        if (msg.type === 'done') {\n          state.indexingStatusText = 'Index completed';\n          state.indexingStartedAt = 0;\n          state.indexingLastProgressAt = 0;\n          state.indexingElapsedMs = null;\n          state.indexingEtaMs = null;\n          state.indexingProgressRatio = 1;\n          state.hasEverCompletedIndex = true;\n          updateIndexingProgressUI();\n          if (controller) controller.dispatch('indexing_done');\n          render(state, { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null });\n        }\n        if (msg.type === 'OPEN_RESULT_URL') {\n          if (msg.url) window.open(msg.url, 'figdex_web', 'width=1200,height=800');\n        }\n        if (msg.type === 'error') {\n          state.indexingStartedAt = 0;\n          state.indexingLastProgressAt = 0;\n          state.indexingElapsedMs = null;\n          state.indexingEtaMs = null;\n          state.indexingProgressRatio = null;\n          state.lastIndexError = msg.message || 'Indexing failed.';\n          state.lastIndexErrorCode = msg.code || null;\n          state.lastIndexUpgradeUrl = msg.upgradeUrl || null;\n          updateIndexingProgressUI();\n          controller && controller.dispatch('indexing_failed', { message: msg.message });\n          render(state, { fileKey: state.fileKey, pages: state.pages, selectedPages: state.selectedPages, identity: identityStore ? identityStore.getIdentity() : null });\n        }\n      });\n\n      function openWebLogin() { if (controller) controller.dispatch('intent_open_web'); else window.open('https://www.figdex.com/login?from=figma-plugin', 'figdex_web', 'width=1200,height=800'); }\n      function openWebLoginInNewWindow() { openWebLogin(); }\n      window.openWebLogin = openWebLogin;\n      window.openWebLoginInNewWindow = openWebLoginInNewWindow;\n\n      if (document.readyState === 'loading') {\n        document.addEventListener('DOMContentLoaded', init);\n      } else {\n        init();\n      }\n\n    </script>\n  </body>\n</html>\n";
const PLUGIN_UI_PATCH_SCRIPT = `
<script>
  (function () {
    function getIdentity() {
      try {
        if (window.identityStore && typeof window.identityStore.getIdentity === 'function') return window.identityStore.getIdentity();
        if (window.__figdexIdentityStore && typeof window.__figdexIdentityStore.getIdentity === 'function') return window.__figdexIdentityStore.getIdentity();
      } catch (e) {}
      return null;
    }

    function getModel() {
      return {
        fileKey: window.state && window.state.fileKey ? window.state.fileKey : '',
        pages: window.state && Array.isArray(window.state.pages) ? window.state.pages : [],
        selectedPages: window.state && Array.isArray(window.state.selectedPages) ? window.state.selectedPages : [],
        identity: getIdentity()
      };
    }

    function ensureRepairButton() {
      var toolbar = document.querySelector('.pages-toolbar');
      if (!toolbar) return null;
      var button = document.getElementById('repairGalleryPagesBtn');
      if (button) return button;
      button = document.createElement('button');
      button.type = 'button';
      button.id = 'repairGalleryPagesBtn';
      button.className = 'pages-action-btn';
      button.textContent = 'Repair gallery';
      button.title = 'Temporary repair for legacy page order and page metadata';
      button.addEventListener('click', function () {
        if (!window.state || window.state.galleryRepairInFlight) return;
        window.state.galleryRepairInFlight = true;
        window.state.galleryRepairLastMessage = '';
        syncRepairButton(getModel());
        if (typeof window.render === 'function') window.render(window.state, getModel());
        if (typeof window.sendIntent === 'function') window.sendIntent('repair-gallery-pages');
      });
      toolbar.appendChild(button);
      return button;
    }

    function syncRepairButton(model) {
      var button = ensureRepairButton();
      if (!button) return;
      var identity = model && model.identity ? model.identity : getIdentity();
      var connected = !!(identity && identity.exists);
      var fileKey = model && model.fileKey ? model.fileKey : (window.state && window.state.fileKey ? window.state.fileKey : '');
      var inFlight = !!(window.state && window.state.galleryRepairInFlight);
      button.style.display = connected && fileKey ? 'inline-block' : 'none';
      button.disabled = !connected || !fileKey || inFlight;
      button.textContent = inFlight ? 'Repairing…' : 'Repair gallery';
    }

    function patchRender() {
      if (window.__figdexRepairRenderPatched || typeof window.render !== 'function') return;
      var originalRender = window.render;
      window.render = function () {
        var result = originalRender.apply(this, arguments);
        try {
          syncRepairButton(arguments[1] || getModel());
        } catch (e) {}
        return result;
      };
      window.__figdexRepairRenderPatched = true;
    }

    window.addEventListener('message', function (event) {
      if (!event.data) return;
      var msg = event.data.pluginMessage != null ? event.data.pluginMessage : event.data;
      if (!msg || typeof msg !== 'object' || msg.type !== 'repair-gallery-pages-status') return;
      if (!window.state) window.state = {};
      window.state.galleryRepairInFlight = msg.status === 'working';
      window.state.galleryRepairLastMessage = msg.message || '';
      syncRepairButton(getModel());
      if (typeof window.render === 'function') window.render(window.state, getModel());
    });

    function boot() {
      patchRender();
      ensureRepairButton();
      syncRepairButton(getModel());
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    setTimeout(boot, 300);
  })();
</script>`;

figma.showUI(PLUGIN_UI_HTML.replace('</body>', PLUGIN_UI_PATCH_SCRIPT + '</body>'), { width: 386, height: 800 });

function debugLog() {
  if (!DEBUG_LOGS) return;
  try { console.log.apply(console, arguments); } catch (e) {}
}
function pluginConsoleLog(level, message, meta) {
  var method = console && typeof console[level] === 'function' ? console[level] : console.log;
  var prefix = '[FigDex][plugin]';
  try {
    if (meta !== undefined) method.call(console, prefix + ' ' + message, meta);
    else method.call(console, prefix + ' ' + message);
  } catch (e) {
    try { console.log(prefix + ' ' + message); } catch (_) {}
  }
}
function pluginTrace(message, meta) {
  pluginConsoleLog('log', message, meta);
}
function pluginWarn(message, meta) {
  pluginConsoleLog('warn', message, meta);
}
function pluginError(message, meta) {
  pluginConsoleLog('error', message, meta);
}
function postToUI(message) {
  try {
    figma.ui.postMessage(message);
    return true;
  } catch (error) {
    pluginWarn('Skipped UI postMessage because no UI is available', {
      type: message && message.type ? message.type : 'unknown',
      error: error && error.message ? error.message : String(error || '')
    });
    return false;
  }
}

try { figma.ui.postMessage({ type: 'plugin-version', version: PLUGIN_VERSION }); } catch (e) {}
setTimeout(() => { try { figma.ui.postMessage({ type: 'plugin-version', version: PLUGIN_VERSION }); } catch (e) {} }, 500);

const rootId = figma.root.id || '0:0';
function normalizeDocumentToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[|:]/g, '-');
}
function simpleHash(value) {
  var input = String(value || '');
  var hash = 5381;
  for (var i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(36);
}
function getCurrentDocumentFallbackScope() {
  var docName = normalizeDocumentToken(figma.root.name || 'untitled');
  var pages = Array.isArray(figma.root.children) ? figma.root.children : [];
  var pageNames = [];
  for (var i = 0; i < pages.length; i++) {
    var page = pages[i];
    if (page && page.type === 'PAGE') pageNames.push(normalizeDocumentToken(page.name || 'page'));
  }
  var signature = docName + '|' + pageNames.length + '|' + pageNames.join('|');
  return 'doc:' + simpleHash(signature);
}
function getLegacyDocumentScopeIds() {
  var scopes = [];
  var currentFallbackScope = getCurrentDocumentFallbackScope();
  if (currentFallbackScope) scopes.push(currentFallbackScope);
  var docName = (typeof figma.root.name === 'string' && figma.root.name.trim()) ? figma.root.name.trim().toLowerCase() : '';
  if (docName) scopes.push('docname:' + docName);
  if (rootId) scopes.push(rootId);
  return Array.from(new Set(scopes.filter(Boolean)));
}
function getCurrentDocumentId() {
  var liveFileKey = (typeof figma.fileKey === 'string' && figma.fileKey.trim()) ? figma.fileKey.trim() : '';
  if (liveFileKey) return 'file:' + liveFileKey;
  return getCurrentDocumentFallbackScope();
}
figma.ui.postMessage({ type: 'set-document-id', documentId: getCurrentDocumentId() });
figma.on('currentpagechange', () => {
  postToUI({ type: 'set-document-id', documentId: getCurrentDocumentId() });
});

figma.on('selectionchange', () => {
  const selection = figma.currentPage.selection;
  const hasSelection = selection.length > 0;
  const hasFrameSelection = selection.some(n => n.type === 'FRAME');
  const selectedFrames = selection.filter(n => n.type === 'FRAME').map(n => n.id);
  postToUI({ type: 'selection-status', hasSelection, hasFrameSelection, selectedFrames });
});

// --- Dev: simulate connected identity (no UI flag) ---
const mockConnectedIdentity = false;

// --- Storage ---
const STORAGE_KEYS = {
  FILE_KEY: 'fileKey',
  FILE_NAME: 'fileName',
  SELECTED_PAGES: 'selectedPages',
  INDEXED_PAGES: 'indexedPages',
  WEB_TOKEN: 'webToken',
  WEB_USER: 'webUser',
  CONNECT_NONCE_DATA: 'connectNonceData',
  ANON_ID: 'anonId',
  HAS_EVER_INDEXED: 'hasEverIndexed'
};

const GLOBAL_STORAGE_KEYS = [STORAGE_KEYS.WEB_TOKEN, STORAGE_KEYS.WEB_USER, STORAGE_KEYS.ANON_ID, STORAGE_KEYS.HAS_EVER_INDEXED];
const DOCUMENT_SCOPED_STORAGE_KEYS = [STORAGE_KEYS.FILE_KEY, STORAGE_KEYS.FILE_NAME, STORAGE_KEYS.SELECTED_PAGES, STORAGE_KEYS.INDEXED_PAGES, STORAGE_KEYS.CONNECT_NONCE_DATA];

function getDocumentScopeId() {
  var liveFileKey = (typeof figma.fileKey === 'string' && figma.fileKey.trim()) ? figma.fileKey.trim() : '';
  if (liveFileKey) return liveFileKey;
  var fallbackScope = getCurrentDocumentFallbackScope();
  if (fallbackScope) return fallbackScope;
  return figma.root.id || rootId || '0:0';
}

async function resolveCurrentFileKey() {
  var storedDocKey = await getStored(STORAGE_KEYS.FILE_KEY, null);
  if (typeof storedDocKey === 'string' && storedDocKey.trim()) {
    var trimmedStoredDocKey = storedDocKey.trim();
    if (trimmedStoredDocKey !== globalFileKey) globalFileKey = trimmedStoredDocKey;
    if (trimmedStoredDocKey !== sessionFileKey) sessionFileKey = trimmedStoredDocKey;
    return { fileKey: trimmedStoredDocKey, source: 'saved' };
  }
  return { fileKey: '', source: 'none' };
}

function cryptoRandomString() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return s;
}
function storageKey(key) {
  return GLOBAL_STORAGE_KEYS.indexOf(key) >= 0 ? 'figdex_' + key : 'figdex_' + getDocumentScopeId() + '_' + key;
}
function storageKeyForScope(scopeId, key) {
  return GLOBAL_STORAGE_KEYS.indexOf(key) >= 0 ? 'figdex_' + key : 'figdex_' + scopeId + '_' + key;
}
async function getStored(key, def) {
  try {
    const v = await figma.clientStorage.getAsync(storageKey(key));
    return v !== undefined ? v : def;
  } catch (e) { return def; }
}
async function getStoredForScope(scopeId, key, def) {
  try {
    const v = await figma.clientStorage.getAsync(storageKeyForScope(scopeId, key));
    return v !== undefined ? v : def;
  } catch (e) { return def; }
}
async function setStored(key, value) {
  try { await figma.clientStorage.setAsync(storageKey(key), value); } catch (e) { console.error(e); }
}
async function setStoredForScope(scopeId, key, value) {
  try { await figma.clientStorage.setAsync(storageKeyForScope(scopeId, key), value); } catch (e) { console.error(e); }
}
async function deleteStoredForScope(scopeId, key) {
  try { await figma.clientStorage.deleteAsync(storageKeyForScope(scopeId, key)); } catch (e) { console.warn('deleteStoredForScope:', scopeId, key, e); }
}

async function migrateDocumentScopedStateToReliableFileKey() {
  var reliableFileKey = (typeof figma.fileKey === 'string' && figma.fileKey.trim()) ? figma.fileKey.trim() : '';
  if (!reliableFileKey) return;
  var legacyScopes = getLegacyDocumentScopeIds().filter(function (scopeId) { return scopeId && scopeId !== reliableFileKey; });
  if (!legacyScopes.length) return;
  for (var li = 0; li < legacyScopes.length; li++) {
    var legacyScope = legacyScopes[li];
    for (var ki = 0; ki < DOCUMENT_SCOPED_STORAGE_KEYS.length; ki++) {
      var scopedKey = DOCUMENT_SCOPED_STORAGE_KEYS[ki];
      var currentValue = await getStoredForScope(reliableFileKey, scopedKey, undefined);
      if (currentValue !== undefined && currentValue !== null) continue;
      var legacyValue = await getStoredForScope(legacyScope, scopedKey, undefined);
      if (legacyValue === undefined || legacyValue === null) continue;
      await setStoredForScope(reliableFileKey, scopedKey, legacyValue);
    }
  }
}

async function deleteCurrentDocumentLegacyState() {
  var reliableFileKey = (typeof figma.fileKey === 'string' && figma.fileKey.trim()) ? figma.fileKey.trim() : '';
  var scopes = getLegacyDocumentScopeIds();
  if (reliableFileKey) scopes.push(reliableFileKey);
  var uniqueScopes = Array.from(new Set(scopes.filter(Boolean)));
  for (var si = 0; si < uniqueScopes.length; si++) {
    for (var ki = 0; ki < DOCUMENT_SCOPED_STORAGE_KEYS.length; ki++) {
      await deleteStoredForScope(uniqueScopes[si], DOCUMENT_SCOPED_STORAGE_KEYS[ki]);
    }
    await deleteStoredForScope(uniqueScopes[si], STORAGE_KEYS.WEB_TOKEN);
    await deleteStoredForScope(uniqueScopes[si], STORAGE_KEYS.WEB_USER);
  }
}

const FETCH_TIMEOUT_MS = 90000; // 90s — server allows 60s, extra buffer for large uploads
const CHUNK_RETRYABLE_STATUSES = { 429: true, 502: true, 503: true, 504: true };
const MAX_CHUNK_UPLOAD_ATTEMPTS = 4;
const STORAGE_FIRST_TRIGGER_FRAMES = 120;
const FORCE_STORAGE_FIRST_UPLOADS = true;
const STORAGE_FIRST_USE_DIRECT_UPLOADS = false;
const DIRECT_UPLOAD_FRAMES_PER_CHUNK = 6;
const STORAGE_FIRST_FRAMES_PER_CHUNK = 14;
const DIRECT_UPLOAD_MAX_CHUNK_BYTES = Math.floor(1.5 * 1024 * 1024);
const STORAGE_FIRST_MAX_CHUNK_BYTES = Math.floor(2.2 * 1024 * 1024);
const LARGE_FILE_TRIGGER_PAGES = 6;
const LARGE_FILE_TRIGGER_FRAMES = 120;
const INDEX_WARN_LOAD_SCORE = 75;
const INDEX_WARN_PAGE_COUNT = 8;
const INDEX_WARN_MAX_PAGE_FRAMES = 72;
const INDEX_DANGER_LOAD_SCORE = 180;
const INDEX_DANGER_PAGE_COUNT = 16;
const INDEX_DANGER_MAX_PAGE_FRAMES = 120;

function estimateIndexLoad(pageFrameCounts) {
  var counts = Array.isArray(pageFrameCounts) ? pageFrameCounts.slice() : [];
  var totalFrames = counts.reduce(function (sum, count) { return sum + (typeof count === 'number' ? count : 0); }, 0);
  var pageCount = counts.length;
  var maxPageFrames = counts.length ? Math.max.apply(Math, counts) : 0;
  var score = totalFrames;
  if (pageCount > 6) score += (pageCount - 6) * 4;
  for (var i = 0; i < counts.length; i++) {
    var count = counts[i];
    if (count > 24) score += 8;
    if (count > 48) score += 16;
    if (count > 80) score += 24;
  }
  return {
    score: score,
    totalFrames: totalFrames,
    pageCount: pageCount,
    maxPageFrames: maxPageFrames
  };
}

function evaluateIndexAdmission(pageFrameCounts) {
  var load = estimateIndexLoad(pageFrameCounts);
  var isDanger = load.score >= INDEX_DANGER_LOAD_SCORE || load.pageCount >= INDEX_DANGER_PAGE_COUNT || load.maxPageFrames >= INDEX_DANGER_MAX_PAGE_FRAMES;
  var shouldWarn = isDanger || load.score >= INDEX_WARN_LOAD_SCORE || load.pageCount >= INDEX_WARN_PAGE_COUNT || load.maxPageFrames >= INDEX_WARN_MAX_PAGE_FRAMES;
  var reasons = [];
  if (load.pageCount >= INDEX_WARN_PAGE_COUNT) reasons.push(load.pageCount + ' pages');
  if (load.totalFrames >= INDEX_WARN_LOAD_SCORE) reasons.push(load.totalFrames + ' frames');
  if (load.maxPageFrames >= INDEX_WARN_MAX_PAGE_FRAMES) reasons.push('one page with ' + load.maxPageFrames + ' frames');
  return {
    score: load.score,
    totalFrames: load.totalFrames,
    pageCount: load.pageCount,
    maxPageFrames: load.maxPageFrames,
    shouldWarn: shouldWarn,
    isDanger: isDanger,
    reasonText: reasons.join(', ')
  };
}
const LARGE_FILE_BATCH_MAX_PAGES = 3;
const LARGE_FILE_BATCH_MAX_FRAMES = 60;

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function getRetryAfterMs(res, attempt) {
  try {
    if (res && res.headers && typeof res.headers.get === 'function') {
      var retryAfter = res.headers.get('Retry-After');
      if (retryAfter) {
        var seconds = Number(retryAfter);
        if (!Number.isNaN(seconds) && seconds > 0) return seconds * 1000;
      }
    }
  } catch (e) {}
  return Math.min(12000, 1500 * Math.pow(2, Math.max(0, attempt - 1)));
}
function fetchWithTimeout(url, opts) {
  var controller = null;
  try { controller = new AbortController(); } catch (e) { controller = null; }
  var timeoutId = null;
  var timeoutPromise = new Promise(function (_, reject) {
    timeoutId = setTimeout(function () {
      if (controller) controller.abort();
      reject(new Error('Request timed out. The server may be slow or unreachable. Try again.'));
    }, FETCH_TIMEOUT_MS);
  });
  var opts2 = opts || {};
  if (controller) opts2.signal = controller.signal;
  return Promise.race([
    fetch(url, opts2).then(function (res) {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
}

function normalizeExternalErrorMessage(status, errJson, errText, fallbackMessage) {
  var fallback = fallbackMessage || 'Index failed';
  if (status === 401) {
    var authMessage = errJson && errJson.error ? String(errJson.error) : '';
    if (!authMessage && typeof errText === 'string') authMessage = errText.trim();
    if (/invalid api key|api key required|invalid account token|authorization required/i.test(authMessage || '')) {
      return 'Your FigDex connection expired. Please reconnect your account and try again.';
    }
  }
  if (errJson && errJson.error) {
    var baseMessage = String(errJson.error);
    var details = errJson.details ? String(errJson.details) : '';
    var detailsLower = details.toLowerCase();
    if (details && (detailsLower.indexOf('<!doctype html') >= 0 || detailsLower.indexOf('<html') >= 0 || detailsLower.indexOf('web server is down') >= 0 || detailsLower.indexOf('error code 521') >= 0)) {
      return 'Storage service is temporarily unavailable. Please try again in a minute.';
    }
    if (details && baseMessage !== details) {
      return baseMessage + ' — ' + details;
    }
    return baseMessage;
  }
  var raw = typeof errText === 'string' ? errText.trim() : '';
  var rawLower = raw.toLowerCase();
  if (status === 521 || rawLower.indexOf('error code 521') >= 0 || rawLower.indexOf('web server is down') >= 0 || rawLower.indexOf('cloudflare') >= 0) {
    return 'Storage service is temporarily unavailable. Please try again in a minute.';
  }
  if (raw && (rawLower.indexOf('<!doctype html') >= 0 || rawLower.indexOf('<html') >= 0)) {
    return 'The server returned an unexpected HTML error page. Please try again in a minute.';
  }
  return fallback;
}

function pageHasIndexableFrames(pageNode) {
  if (!pageNode || !Array.isArray(pageNode.children)) return false;
  return pageNode.children.some(function (node) {
    if (!node) return false;
    if (node.type === 'FRAME' && isNodeVisible(node)) return true;
    if (node.type === 'SECTION' && Array.isArray(node.children)) {
      return node.children.some(function (child) {
        return child && child.type === 'FRAME' && isNodeVisible(child);
      });
    }
    return false;
  });
}

async function buildCurrentFilePageMeta() {
  await figma.loadAllPagesAsync();
  return figma.root.children
    .filter(function (pageNode) {
      return pageNode && pageNode.type === 'PAGE' && pageNode.name !== 'FigDex' && pageNode.name !== 'Frame-Index';
    })
    .map(function (pageNode, pageIndex) {
      var pageName = String(pageNode.name || ('Page ' + (pageIndex + 1))).trim() || ('Page ' + (pageIndex + 1));
      return {
        id: pageNode.id,
        pageId: pageNode.id,
        name: pageName,
        pageName: pageName,
        sortOrder: pageIndex,
        frameCount: getTopLevelFrameIds(pageNode).length,
        hasFrames: pageHasIndexableFrames(pageNode),
      };
    });
}

async function repairGalleryPagesOnServer(fileKey, token) {
  if (!fileKey) throw new Error('Missing file key');
  if (!token) throw new Error('Connect your FigDex account before running repair.');
  var pageMeta = await buildCurrentFilePageMeta();
  if (!pageMeta.length) throw new Error('No Figma pages found to repair.');
  var coverImageDataUrl = null;
  try {
    coverImageDataUrl = await getCoverImageDataUrl();
  } catch (_) {
    coverImageDataUrl = null;
  }
  var res = await fetchWithTimeout('https://www.figdex.com/api/repair-file-pages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      fileKey: fileKey,
      pageMeta: pageMeta,
      coverImageDataUrl: coverImageDataUrl
    })
  });
  if (!res.ok) {
    var errText = '';
    try { errText = await res.text(); } catch (_) {}
    var errJson = null;
    try { errJson = errText ? JSON.parse(errText) : null; } catch (_) {}
    throw new Error(normalizeExternalErrorMessage(res.status, errJson, errText, 'Failed to repair gallery pages'));
  }
  try {
    return await res.json();
  } catch (_) {
    return { success: true, pageMetaCount: pageMeta.length };
  }
}

async function ensureValidIndexingToken(webToken) {
  if (!webToken || typeof webToken !== 'string' || webToken.length < 10) {
    return { ok: false, message: 'Connect your FigDex account before indexing.' };
  }
  if (!webToken.startsWith('figdex_')) {
    await clearStoredWebIdentity();
    return { ok: false, message: 'Your FigDex connection needs to be refreshed. Please reconnect and try again.' };
  }
  try {
    var validateRes = await fetchWithTimeout('https://www.figdex.com/api/validate-api-key', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + webToken }
    });
    if (!validateRes.ok) {
      if (validateRes.status === 401 || validateRes.status === 404) {
        await clearStoredWebIdentity();
        return { ok: false, message: 'Your FigDex connection expired. Please reconnect and try again.' };
      }
      if (validateRes.status === 429 || validateRes.status === 502 || validateRes.status === 503 || validateRes.status === 504) {
        pluginWarn('Token validation hit transient server error; continuing with cached token', {
          status: validateRes.status
        });
        return { ok: true, degraded: true };
      }
      return { ok: false, message: 'Could not verify your FigDex connection. Please try again.' };
    }
    return { ok: true };
  } catch (error) {
    pluginWarn('Token validation request failed; continuing with cached token', {
      message: error && error.message ? String(error.message) : 'Network issue'
    });
    return { ok: true, degraded: true };
  }
}

async function postChunkWithRetry(url, requestOptions, meta) {
  var lastError = null;
  var lastResponse = null;
  for (var attempt = 1; attempt <= MAX_CHUNK_UPLOAD_ATTEMPTS; attempt++) {
    if (activeIndexRunMetrics) {
      activeIndexRunMetrics.maxChunkAttempts = Math.max(activeIndexRunMetrics.maxChunkAttempts, attempt);
    }
    try {
      var response = await fetchWithTimeout(url, requestOptions);
      if (response.ok) {
        return { ok: true, response: response, attempts: attempt };
      }
      lastResponse = response;
      var isRetryable = !!CHUNK_RETRYABLE_STATUSES[response.status];
      if (!isRetryable || attempt === MAX_CHUNK_UPLOAD_ATTEMPTS) {
        return { ok: false, response: response, attempts: attempt };
      }
      var waitMs = getRetryAfterMs(response, attempt);
      var retryStep = 'Retrying part ' + meta.chunkNumber + '/' + meta.totalChunks + ' in ' + Math.ceil(waitMs / 1000) + 's...';
      pluginWarn('Chunk upload retry scheduled', {
        chunkNumber: meta.chunkNumber,
        totalChunks: meta.totalChunks,
        attempt: attempt,
        status: response.status,
        waitMs: waitMs
      });
      if (activeIndexRunMetrics) {
        activeIndexRunMetrics.retryCount += 1;
        if (response.status === 504) activeIndexRunMetrics.status504Count += 1;
      }
      figma.notify(retryStep, { timeout: 1500 });
      postUploadProgressMessage({ type: 'upload-progress', step: retryStep, framesDone: meta.framesDone });
      await logIndexStage(retryStep, {
        chunkNumber: meta.chunkNumber,
        totalChunks: meta.totalChunks,
        framesDone: meta.framesDone,
        attempts: attempt,
      });
      await sleep(waitMs);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_CHUNK_UPLOAD_ATTEMPTS) break;
      var networkWaitMs = Math.min(10000, 1200 * Math.pow(2, Math.max(0, attempt - 1)));
      var networkRetryStep = 'Connection issue on part ' + meta.chunkNumber + '/' + meta.totalChunks + '. Retrying...';
      pluginWarn('Chunk upload hit network issue', {
        chunkNumber: meta.chunkNumber,
        totalChunks: meta.totalChunks,
        attempt: attempt,
        message: error && error.message ? String(error.message) : 'Network issue',
        waitMs: networkWaitMs
      });
      if (activeIndexRunMetrics) activeIndexRunMetrics.networkRetryCount += 1;
      figma.notify(networkRetryStep, { timeout: 1500 });
      postUploadProgressMessage({ type: 'upload-progress', step: networkRetryStep, framesDone: meta.framesDone });
      await logIndexStage(networkRetryStep, {
        chunkNumber: meta.chunkNumber,
        totalChunks: meta.totalChunks,
        framesDone: meta.framesDone,
        attempts: attempt,
      });
      await sleep(networkWaitMs);
    }
  }
  return { ok: false, response: lastResponse, error: lastError, attempts: MAX_CHUNK_UPLOAD_ATTEMPTS };
}

async function createStorageFirstUploadSession(token, fileKey, fileName, documentId, pageMeta, coverImageDataUrl) {
  if (!token) throw new Error('Missing account token');
  if (activeIndexRunMetrics) activeIndexRunMetrics.sessionCreateCount += 1;
  var res = await fetchWithTimeout('https://www.figdex.com/api/uploads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      fileKey: fileKey,
      fileName: fileName,
      documentId: documentId,
      pageMeta: Array.isArray(pageMeta) ? pageMeta : [],
      coverImageDataUrl: typeof coverImageDataUrl === 'string' ? coverImageDataUrl : null
    })
  });
  if (!res.ok) {
    var errText = '';
    try { errText = await res.text(); } catch (_) {}
    var errJson = null;
    try { errJson = errText ? JSON.parse(errText) : null; } catch (_) {}
    throw new Error(normalizeExternalErrorMessage(res.status, errJson, errText, 'Failed to create upload session'));
  }
  return await res.json();
}

function sanitizeStoragePathSegment(value, fallbackValue) {
  var normalized = String(value || '').trim().replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  if (!normalized) return fallbackValue || 'chunk';
  return normalized;
}

function buildStorageFirstChunkPath(uploadId, pageBatchIndex, pageBatchCount, chunkNumber, totalChunks) {
  var uploadSegment = sanitizeStoragePathSegment(uploadId, 'upload');
  var pageLabel = String(pageBatchIndex + 1).padStart(3, '0') + '-of-' + String(pageBatchCount).padStart(3, '0');
  var chunkLabel = String(chunkNumber).padStart(3, '0') + '-of-' + String(totalChunks).padStart(3, '0');
  return 'sessions/' + uploadSegment + '/chunks/page-' + pageLabel + '__chunk-' + chunkLabel + '.json';
}

async function createStorageFirstSignedChunkUpload(token, uploadSession, options) {
  if (!token) throw new Error('Missing account token');
  if (!uploadSession || !uploadSession.uploadId) throw new Error('Missing upload session ID');
  var storagePath = buildStorageFirstChunkPath(
    uploadSession.uploadId,
    options.pageBatchIndex,
    options.pageBatchCount,
    options.chunkNumber,
    options.totalChunks
  );
  var fileName = 'page-' + String(options.pageBatchIndex + 1) + '-chunk-' + String(options.chunkNumber) + '.json';
  var res = await fetchWithTimeout('https://www.figdex.com/api/storage/signed-upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      filename: fileName,
      contentType: 'application/json',
      projectId: uploadSession.uploadId,
      storagePath: storagePath
    })
  });
  if (!res.ok) {
    var errText = '';
    try { errText = await res.text(); } catch (_) {}
    var errJson = null;
    try { errJson = errText ? JSON.parse(errText) : null; } catch (_) {}
    throw new Error(normalizeExternalErrorMessage(res.status, errJson, errText, 'Failed to create signed upload URL'));
  }
  var data = await res.json();
  if (!data || !data.signedUrl || !data.path) {
    throw new Error('Signed upload URL response is missing required fields');
  }
  return data;
}

async function commitStorageFirstUploadSession(uploadSession, token, options) {
  if (!uploadSession || !uploadSession.commitUrl) throw new Error('Missing upload session commit URL');
  if (activeIndexRunMetrics) activeIndexRunMetrics.commitAttemptCount += 1;
  var commitBody = {};
  if (options && Array.isArray(options.chunkPaths) && options.chunkPaths.length) {
    commitBody.chunkPaths = options.chunkPaths.slice(0, 500);
  }
  var res = await fetchWithTimeout('https://www.figdex.com' + uploadSession.commitUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify(commitBody)
  });
  if (!res.ok) {
    var errText = '';
    try { errText = await res.text(); } catch (_) {}
    var errJson = null;
    try { errJson = errText ? JSON.parse(errText) : null; } catch (_) {}
    pluginError('Storage-first commit failed', {
      uploadId: uploadSession.uploadId || null,
      status: res.status,
      chunkPathsCount: commitBody.chunkPaths ? commitBody.chunkPaths.length : 0,
      error: errJson && errJson.error ? String(errJson.error) : null,
      details: errJson && errJson.details ? String(errJson.details) : null,
      uploadIdFromServer: errJson && errJson.uploadId ? String(errJson.uploadId) : null,
      checkedPrefix: errJson && errJson.checkedPrefix ? String(errJson.checkedPrefix) : null,
      providedChunkPaths: errJson && typeof errJson.providedChunkPaths === 'number' ? errJson.providedChunkPaths : null,
      chunkPathsCountFromServer: errJson && typeof errJson.chunkPathsCount === 'number' ? errJson.chunkPathsCount : null,
      failedChunkDownloads: errJson && Array.isArray(errJson.failedChunkDownloads) ? errJson.failedChunkDownloads.slice(0, 5) : null,
      rawText: errJson ? null : (errText || null)
    });
    throw new Error(normalizeExternalErrorMessage(res.status, errJson, errText, 'Failed to finalize upload session'));
  }
  try {
    return await res.json();
  } catch (_) {
    return { success: true };
  }
}

async function applyLocalIndexedPageState(indexedMeta, pageIds, idToName, pageSignaturesById) {
  var nextMeta = Array.isArray(indexedMeta) ? indexedMeta.slice() : [];
  nextMeta = nextMeta.filter(function (m) {
    return !(m && m.pageId && pageIds.indexOf(m.pageId) >= 0);
  });
  for (var i = 0; i < pageIds.length; i++) {
    var pageId = pageIds[i];
    nextMeta.push({
      pageId: pageId,
      pageName: idToName[pageId] || 'Page',
      lastIndexedAt: Date.now(),
      frameSignatures: Array.isArray(pageSignaturesById[pageId]) ? pageSignaturesById[pageId] : []
    });
  }
  try {
    await setStored(STORAGE_KEYS.INDEXED_PAGES, nextMeta);
  } catch (_) {}
  try {
    figma.ui.postMessage({ type: 'pages-indexed', pageIds: pageIds });
  } catch (_) {}
  return nextMeta;
}
function estimateJsonBytes(value) {
  try {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(JSON.stringify(value)).length;
    }
  } catch (e) {}
  try {
    return JSON.stringify(value).length;
  } catch (e) {
    return 0;
  }
}

function countFramesInChunkPages(chunkPages) {
  if (!Array.isArray(chunkPages)) return 0;
  var total = 0;
  for (var i = 0; i < chunkPages.length; i++) {
    var page = chunkPages[i];
    total += Array.isArray(page && page.frames) ? page.frames.length : 0;
  }
  return total;
}

function splitChunkPagesInHalf(chunkPages) {
  if (!Array.isArray(chunkPages) || chunkPages.length === 0) return null;
  var flattened = [];
  for (var i = 0; i < chunkPages.length; i++) {
    var page = chunkPages[i];
    var frames = Array.isArray(page && page.frames) ? page.frames : [];
    for (var j = 0; j < frames.length; j++) {
      flattened.push({
        id: page.id || page.pageId,
        name: page.name || page.pageName || 'Page',
        frame: frames[j]
      });
    }
  }
  if (flattened.length <= 1) return null;
  var midpoint = Math.ceil(flattened.length / 2);
  function buildChunk(entries) {
    var pageMap = {};
    for (var k = 0; k < entries.length; k++) {
      var entry = entries[k];
      if (!pageMap[entry.id]) pageMap[entry.id] = { id: entry.id, name: entry.name, frames: [] };
      pageMap[entry.id].frames.push(entry.frame);
    }
    var pages = [];
    for (var pageId in pageMap) pages.push(pageMap[pageId]);
    return pages;
  }
  return [buildChunk(flattened.slice(0, midpoint)), buildChunk(flattened.slice(midpoint))];
}

function normalizeChunkSpecsForRequestSize(chunkSpecs, options) {
  var specs = Array.isArray(chunkSpecs) ? chunkSpecs.slice() : [];
  var normalized = [];
  var maxBytes = options && options.maxBytes ? options.maxBytes : Math.floor(1.5 * 1024 * 1024);
  while (specs.length > 0) {
    var chunkPages = specs.shift();
    var chunkBody = {
      fileKey: options.fileKey,
      docId: options.docId,
      fileName: options.fileName,
      chunkIndex: 0,
      totalChunks: 1,
      selectedPages: options.includeSelectionMetadata ? options.selectedPages : undefined,
      source: 'figma-plugin',
      version: options.version,
      galleryOnly: true,
      imageQuality: 0.75,
      indexPayload: { pages: chunkPages },
      coverImageDataUrl: options.includeCover ? (options.coverImageDataUrl || undefined) : undefined
    };
    if (options.mergePages && options.replacePageIds && options.replacePageIds.length > 0) {
      chunkBody.mergePages = true;
      chunkBody.replacePageIds = options.replacePageIds;
    }
    if (options.anonId) chunkBody.anonId = options.anonId;
    var estimatedBytes = estimateJsonBytes(chunkBody);
    if (estimatedBytes <= maxBytes || countFramesInChunkPages(chunkPages) <= 1) {
      normalized.push(chunkPages);
      continue;
    }
    var splitChunks = splitChunkPagesInHalf(chunkPages);
    if (!splitChunks) {
      normalized.push(chunkPages);
      continue;
    }
    specs.unshift(splitChunks[1]);
    specs.unshift(splitChunks[0]);
  }
  return normalized;
}

function getAdaptiveExportScales(width, height, options) {
  var w = Math.max(1, Number(width) || 1);
  var h = Math.max(1, Number(height) || 1);
  var longestSide = Math.max(w, h);
  var targetLongestSides = Array.isArray(options && options.targetLongestSides) && options.targetLongestSides.length > 0
    ? options.targetLongestSides
    : [2000, 1600, 1200, 900, 700, 500];
  var scales = [];
  var maxOriginalLongestSide = Math.max(1, Number(options && options.maxOriginalLongestSide) || 2000);
  if (longestSide <= maxOriginalLongestSide) {
    scales.push(1);
  }
  for (var i = 0; i < targetLongestSides.length; i++) {
    var target = targetLongestSides[i];
    var scale = Math.min(1, target / longestSide);
    if (scale > 0) scales.push(Math.max(0.08, scale));
  }
  return scales;
}

function getPageExportProfile(frameCount) {
  var count = Math.max(1, Number(frameCount) || 1);
  if (count >= 120) {
    return {
      maxBytes: 260 * 1024,
      maxOriginalLongestSide: 1000,
      targetLongestSides: [1000, 800, 640, 480, 360, 280, 220]
    };
  }
  if (count >= 80) {
    return {
      maxBytes: 340 * 1024,
      maxOriginalLongestSide: 1200,
      targetLongestSides: [1200, 1000, 800, 640, 480, 360, 280]
    };
  }
  if (count >= 50) {
    return {
      maxBytes: 460 * 1024,
      maxOriginalLongestSide: 1400,
      targetLongestSides: [1400, 1200, 900, 700, 500, 360, 280]
    };
  }
  return {
    maxBytes: 900 * 1024,
    maxOriginalLongestSide: 2000,
    targetLongestSides: [2000, 1600, 1200, 900, 700, 500]
  };
}

async function exportFrameImageData(frame, width, height, options) {
  var attempts = getAdaptiveExportScales(width, height, options).concat([0.4, 0.25, 0.18, 0.12, 0.08]);
  var tried = {};
  var maxBytes = Math.max(160 * 1024, Number(options && options.maxBytes) || 900 * 1024);
  for (var i = 0; i < attempts.length; i++) {
    var scale = Math.max(0.08, Math.min(1, attempts[i]));
    var key = scale.toFixed(3);
    if (tried[key]) continue;
    tried[key] = true;
    try {
      var bytes = await frame.exportAsync({ format: 'JPG', constraint: { type: 'SCALE', value: scale } });
      if (bytes && bytes.length > 0) {
        if (bytes.length > maxBytes && i < attempts.length - 1) {
          continue;
        }
        return { bytes: bytes, scale: scale };
      }
    } catch (e) {}
  }
  throw new Error('FRAME_EXPORT_FAILED');
}

let globalFileKey = '';
let sessionFileKey = '';
let globalFileKeySource = 'none';
let activeIndexRunId = null;
let activeIndexSessionId = null;
let lastLoggedIndexStage = '';
let activeIndexRunMetrics = null;
let activeIndexRunStartedAt = 0;
let pagesRefreshInFlight = false;
let lastPagesRefreshHandledAt = 0;
let lastPagesPayloadSignature = '';
let lastPostedFileKeySignature = '';
let lastPostedIdentitySignature = '';

function createPagesPayloadSignature(pageMessage) {
  try {
    return JSON.stringify({
      type: pageMessage && pageMessage.type ? pageMessage.type : 'pages',
      selectedPageIds: Array.isArray(pageMessage && pageMessage.selectedPageIds) ? pageMessage.selectedPageIds : null,
      pages: Array.isArray(pageMessage && pageMessage.pages)
        ? pageMessage.pages.map(function (page) {
            return [
              page.id,
              page.name,
              page.status,
              page.icon,
              !!page.hasFrames,
              !!page.isIndexPage,
              !!page.isCoverPage
            ];
          })
        : []
    });
  } catch (error) {
    return '';
  }
}

function createFileKeyMessageSignature(fileKey, source) {
  return JSON.stringify({
    fileKey: fileKey || '',
    source: source || 'none'
  });
}

function createIndexRunMetrics() {
  return {
    storageFirst: false,
    selectedPagesCount: 0,
    pageBatchCount: 0,
    frameCount: 0,
    chunkDispatches: 0,
    chunkSuccesses: 0,
    appendRequests: 0,
    legacyRequests: 0,
    directUploadRequests: 0,
    retryCount: 0,
    networkRetryCount: 0,
    status504Count: 0,
    sessionCreateCount: 0,
    commitAttemptCount: 0,
    maxChunkAttempts: 1,
    failed: false
  };
}

function classifyIndexRunHealth(metrics) {
  if (!metrics) return 'unknown';
  if (metrics.failed || metrics.status504Count > 0 || metrics.retryCount > 0 || metrics.networkRetryCount > 0) return 'too_busy';
  if (metrics.chunkDispatches > 15) return 'heavy_but_ok';
  return 'ok';
}

function logIndexRunSummary(extra) {
  if (!activeIndexRunId || !activeIndexRunMetrics) return;
  var summary = {
    runId: activeIndexRunId,
    verdict: classifyIndexRunHealth(activeIndexRunMetrics),
    storageFirst: !!activeIndexRunMetrics.storageFirst,
    selectedPagesCount: activeIndexRunMetrics.selectedPagesCount,
    pageBatchCount: activeIndexRunMetrics.pageBatchCount,
    frameCount: activeIndexRunMetrics.frameCount,
    chunkDispatches: activeIndexRunMetrics.chunkDispatches,
    chunkSuccesses: activeIndexRunMetrics.chunkSuccesses,
    appendRequests: activeIndexRunMetrics.appendRequests,
    legacyRequests: activeIndexRunMetrics.legacyRequests,
    directUploadRequests: activeIndexRunMetrics.directUploadRequests,
    retryCount: activeIndexRunMetrics.retryCount,
    networkRetryCount: activeIndexRunMetrics.networkRetryCount,
    status504Count: activeIndexRunMetrics.status504Count,
    sessionCreateCount: activeIndexRunMetrics.sessionCreateCount,
    commitAttemptCount: activeIndexRunMetrics.commitAttemptCount,
    maxChunkAttempts: activeIndexRunMetrics.maxChunkAttempts
  };
  if (extra) {
    for (var key in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, key)) summary[key] = extra[key];
    }
  }
  pluginTrace('Index run summary', summary);
}

function postFileKeyToUI(fileKey, source) {
  var signature = createFileKeyMessageSignature(fileKey, source);
  if (signature === lastPostedFileKeySignature) {
    return false;
  }
  var posted = postToUI({ type: 'set-file-key', fileKey: fileKey || '', source: source || 'none' });
  if (posted) lastPostedFileKeySignature = signature;
  return posted;
}

function createIdentityMessageSignature(token, user) {
  return JSON.stringify({
    token: token || null,
    userId: user && typeof user === 'object' ? (user.id || user.email || null) : null
  });
}

function postIdentityToUI(token, user) {
  var signature = createIdentityMessageSignature(token, user);
  if (signature === lastPostedIdentitySignature) {
    return false;
  }
  var posted = postToUI({ type: 'WEB_ACCOUNT_DATA_LOADED', token: token || null, user: user || null });
  if (posted) lastPostedIdentitySignature = signature;
  return posted;
}

async function sendPluginTelemetryEvent(eventName, meta) {
  try {
    var anonId = await getStored(STORAGE_KEYS.ANON_ID, null);
    var webUser = await getStored(STORAGE_KEYS.WEB_USER, null);
    var userId = webUser && typeof webUser === 'object'
      ? (webUser.id || webUser.email || null)
      : null;
    fetch('https://www.figdex.com/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: eventName,
        timestamp: Date.now(),
        pluginVersion: PLUGIN_VERSION,
        userType: userId ? 'RETURNING' : 'NEW',
        hasFileKey: !!globalFileKey,
        selectedPagesCount: meta && typeof meta.selectedPagesCount === 'number' ? meta.selectedPagesCount : 0,
        fileKeyHash: globalFileKey ? simpleHash(globalFileKey) : null,
        sessionId: activeIndexRunId || null,
        anonId: typeof anonId === 'string' ? anonId : null,
        userId: typeof userId === 'string' ? userId : null,
        meta: meta || {},
      })
    }).catch(function () {});
  } catch (e) {}
}

function normalizeIndexStageLabel(step) {
  var raw = String(step || '').toLowerCase();
  if (!raw) return '';
  if (raw.indexOf('prepar') !== -1) return 'preparing';
  if (raw.indexOf('export') !== -1) return 'exporting';
  if (raw.indexOf('upload') !== -1) return 'uploading';
  if (raw.indexOf('retry') !== -1 || raw.indexOf('connection issue') !== -1) return 'retrying';
  if (raw.indexOf('complete') !== -1 || raw.indexOf('final') !== -1) return 'finalizing';
  return 'working';
}

async function logIndexStage(step, meta) {
  var stage = normalizeIndexStageLabel(step);
  if (!stage) return;
  if (lastLoggedIndexStage === stage && stage !== 'retrying') return;
  lastLoggedIndexStage = stage;
  pluginTrace('Index stage: ' + stage, Object.assign({
    step: step || '',
    runId: activeIndexRunId || null,
    fileKeySource: globalFileKeySource || 'none'
  }, meta || {}));
}

function buildIndexProgressStep(step, meta) {
  var details = meta && typeof meta === 'object' ? meta : {};
  var label = step || 'Updating index…';
  var parts = [];
  if (typeof details.pagesDone === 'number' && typeof details.pageCount === 'number' && details.pageCount > 0) {
    parts.push(details.pagesDone + '/' + details.pageCount + ' pages');
  }
  if (typeof details.framesDone === 'number' && typeof details.totalFrames === 'number' && details.totalFrames > 0) {
    parts.push(details.framesDone + '/' + details.totalFrames + ' frames');
  }
  if (!parts.length) return label;
  return label + ' (' + parts.join(' • ') + ')';
}

function buildIndexProgressTiming(meta) {
  var details = meta && typeof meta === 'object' ? meta : {};
  var startedAt = activeIndexRunStartedAt || 0;
  if (!startedAt) return { elapsedMs: null, etaMs: null, progressRatio: null };
  var elapsedMs = Math.max(0, Date.now() - startedAt);
  var progressRatio = null;
  if (typeof details.framesDone === 'number' && typeof details.totalFrames === 'number' && details.totalFrames > 0) {
    progressRatio = Math.max(0, Math.min(1, details.framesDone / details.totalFrames));
  } else if (typeof details.pagesDone === 'number' && typeof details.pageCount === 'number' && details.pageCount > 0) {
    progressRatio = Math.max(0, Math.min(1, details.pagesDone / details.pageCount));
  }
  var etaMs = null;
  if (progressRatio !== null && progressRatio > 0 && progressRatio < 1 && elapsedMs >= 1000) {
    etaMs = Math.round(elapsedMs * ((1 - progressRatio) / progressRatio));
  }
  return {
    elapsedMs: elapsedMs,
    etaMs: etaMs,
    progressRatio: progressRatio
  };
}

function formatProgressDuration(ms) {
  if (typeof ms !== 'number' || !isFinite(ms) || ms <= 0) return '';
  var totalSeconds = Math.max(1, Math.round(ms / 1000));
  var hours = Math.floor(totalSeconds / 3600);
  var minutes = Math.floor((totalSeconds % 3600) / 60);
  var seconds = totalSeconds % 60;
  if (hours > 0) return hours + 'h ' + minutes + 'm';
  if (minutes > 0) return minutes + 'm ' + seconds + 's';
  return seconds + 's';
}

function appendTimingToProgressStep(step, timing) {
  var label = typeof step === 'string' ? step : '';
  if (!label) return label;
  return label;
}

function postUploadProgressMessage(payload) {
  var nextPayload = payload && typeof payload === 'object' ? Object.assign({}, payload) : { type: 'upload-progress' };
  var timing = buildIndexProgressTiming(nextPayload);
  nextPayload.type = 'upload-progress';
  nextPayload.step = appendTimingToProgressStep(nextPayload.step, timing);
  nextPayload.elapsedMs = timing.elapsedMs;
  nextPayload.etaMs = timing.etaMs;
  nextPayload.progressRatio = timing.progressRatio;
  figma.ui.postMessage(nextPayload);
}

async function postIndexProgress(step, meta) {
  var details = meta && typeof meta === 'object' ? meta : {};
  postUploadProgressMessage({
    type: 'upload-progress',
    step: buildIndexProgressStep(step, details),
    framesDone: typeof details.framesDone === 'number' ? details.framesDone : 0,
    totalFrames: typeof details.totalFrames === 'number' ? details.totalFrames : null,
    pagesDone: typeof details.pagesDone === 'number' ? details.pagesDone : null,
    totalPages: typeof details.pageCount === 'number'
      ? details.pageCount
      : (typeof details.totalPages === 'number' ? details.totalPages : null),
  });
  await logIndexStage(step, details);
}

async function refreshPagesToUI() {
  var resolvedRefreshFileKey = await resolveCurrentFileKey();
  var refreshFileKey = resolvedRefreshFileKey.fileKey || '';
  globalFileKey = refreshFileKey || globalFileKey || '';
  if (resolvedRefreshFileKey.source) globalFileKeySource = resolvedRefreshFileKey.source;
  if (!globalFileKey && sessionFileKey) globalFileKey = sessionFileKey;
  postFileKeyToUI(globalFileKey || '', globalFileKeySource || 'none');

  var allPages = figma.root.children || [];
  var indexedMeta = await getStored(STORAGE_KEYS.INDEXED_PAGES, []);
  if (!Array.isArray(indexedMeta)) indexedMeta = [];
  var pages = [];
  for (var i = 0; i < allPages.length; i++) {
    var p = allPages[i];
    var frameIds = getTopLevelFrameIds(p);
    var hasFrames = frameIds.length > 0;
    var meta = indexedMeta.find(function (entry) { return entry && entry.pageId === p.id; }) || null;
    var status = hasFrames ? (meta ? 'indexed' : 'ready') : 'empty';
    var icon = hasFrames ? (meta ? 'indexed' : 'ready') : 'empty';
    pages.push({
      id: p.id,
      name: p.name,
      frameCount: frameIds.length,
      hasFrames: hasFrames,
      displayName: p.name,
      isFolder: !hasFrames,
      isIndexPage: p.isIndexPage,
      isCoverPage: p.isCoverPage,
      status: status,
      icon: icon
    });
  }
  var savedSelectedIds = null;
  try { savedSelectedIds = await getStored(STORAGE_KEYS.SELECTED_PAGES, null); } catch (e) { savedSelectedIds = null; }
  var hasSavedSelectedIds = Array.isArray(savedSelectedIds);
  if (!hasSavedSelectedIds) savedSelectedIds = [];
  var pageMessage = { type: 'pages', pages: pages };
  if (hasSavedSelectedIds) pageMessage.selectedPageIds = savedSelectedIds;
  var nextPayloadSignature = createPagesPayloadSignature(pageMessage);
  if (!nextPayloadSignature || nextPayloadSignature !== lastPagesPayloadSignature) {
    postToUI(pageMessage);
    lastPagesPayloadSignature = nextPayloadSignature;
  }
}

async function fetchIndexSessionStatus(sessionId, token) {
  try {
    if (!sessionId || !token) return null;
    var startedAt = Date.now();
    var res = await fetchWithTimeout('https://www.figdex.com/api/index-sessions/' + encodeURIComponent(sessionId), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      }
    }, 10000);
    if (!res || !res.ok) return null;
    var data = await res.json();
    var session = data && data.success && data.session ? data.session : null;
    if (session) {
      pluginTrace('Session status fetched', {
        sessionId: sessionId,
        status: session.status,
        totalPages: session.total_pages,
        completedPages: session.completed_pages,
        failedPages: session.failed_pages,
        processedFrames: session.processed_frames,
        totalFrames: session.total_frames,
        durationMs: Date.now() - startedAt
      });
    }
    return session;
  } catch (e) {
    return null;
  }
}

// --- Helpers for gallery index payload (per plugin/docs/OLD_INDEX_LOGIC_FINDINGS.md) ---
// Top-level frames: (1) direct FRAME children of Page; (2) direct FRAME children of each Section (one level only). Excludes [NO_INDEX].
function getTopLevelFrameIds(page) {
  var ids = [];
  var children = page.children || [];
  for (var i = 0; i < children.length; i++) {
    var node = children[i];
    if (node.type === 'FRAME') {
      if ((node.name || '').indexOf('[NO_INDEX]') >= 0) continue;
      if (!isNodeVisible(node)) continue;
      ids.push(node.id);
    }
    if (node.type === 'SECTION' && node.children) {
      if (!isNodeVisible(node)) continue;
      for (var j = 0; j < node.children.length; j++) {
        var child = node.children[j];
        if (child.type === 'FRAME' && (child.name || '').indexOf('[NO_INDEX]') < 0 && isNodeVisible(child)) ids.push(child.id);
      }
    }
  }
  return ids;
}
// Same set as getTopLevelFrameIds but returns frame nodes (for cover selection).
function getTopLevelFrameNodes(page) {
  var nodes = [];
  var children = page.children || [];
  for (var i = 0; i < children.length; i++) {
    var node = children[i];
    if (node.type === 'FRAME') {
      if ((node.name || '').indexOf('[NO_INDEX]') >= 0) continue;
      if (!isNodeVisible(node)) continue;
      nodes.push(node);
    }
    if (node.type === 'SECTION' && node.children) {
      if (!isNodeVisible(node)) continue;
      for (var j = 0; j < node.children.length; j++) {
        var child = node.children[j];
        if (child.type === 'FRAME' && (child.name || '').indexOf('[NO_INDEX]') < 0 && isNodeVisible(child)) nodes.push(child);
      }
    }
  }
  return nodes;
}
// Returns the name of the Section that contains this frame (or null if not inside a Section).
function getSectionNameForFrame(frame) {
  try {
    var cur = frame.parent;
    var guard = 0;
    while (cur && guard++ < 50) {
      if (cur.type === 'SECTION' && cur.name) return cur.name;
      cur = cur.parent;
    }
  } catch (e) {}
  return null;
}
function isNodeVisible(node) {
  try {
    var cur = node;
    while (cur) {
      if (cur.visible === false) return false;
      cur = cur.parent;
    }
    return true;
  } catch (e) { return true; }
}
function collectVisibleTextsFromFrame(frame) {
  try {
    var textNodes = frame.findAll(function (n) { return n.type === 'TEXT'; });
    var texts = [];
    for (var i = 0; i < textNodes.length; i++) {
      var t = textNodes[i];
      if (isNodeVisible(t) && t.characters) texts.push(t.characters);
    }
    return texts;
  } catch (e) { return []; }
}
function collectAncestorNames(frame) {
  var names = [];
  try {
    var cur = frame.parent;
    var guard = 0;
    while (cur && guard++ < 50) {
      if (cur.name && typeof cur.name === 'string') names.push(cur.name);
      cur = cur.parent;
    }
  } catch (e) {}
  return names;
}
function buildSearchTokens(rawTexts) {
  try {
    var joined = Array.isArray(rawTexts) ? rawTexts.join(' ') : String(rawTexts || '');
    var normalized = joined.toLowerCase().replace(/\n+/g, ' ').replace(/[^A-Za-z0-9_\-\s\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!normalized) return [];
    var tokens = normalized.split(' ');
    var filtered = tokens.filter(function (t) { return t && t.length >= 2; });
    return Array.from(new Set(filtered)).slice(0, 500);
  } catch (e) { return []; }
}

// Content hint for change detection: shallow structure (child type + child count per child)
function getContentHint(node) {
  try {
    if (!node || !('children' in node)) return '0';
    var c = node.children;
    if (!c || c.length === 0) return '0';
    return c.map(function (ch) {
      var count = ('children' in ch && ch.children) ? ch.children.length : 0;
      return ch.type + ':' + count;
    }).join(',');
  } catch (e) { return '0'; }
}

// Lightweight text signature: avoid loading fonts during indexing because it is very expensive.
// If characters cannot be read safely, we still keep structural hints and skip the text payload.
function getTextHint(node, depth, acc) {
  if (!node || depth > 4 || (acc && acc.length > 250)) return acc;
  acc = acc || [];
  if (node.type === 'TEXT') {
    try {
      var chars = node.characters;
      if (typeof chars === 'string' && chars.trim()) {
        acc.push(chars.slice(0, 120));
      }
    } catch (e) { /* skip on guarded text read */ }
  }
  if ('children' in node && node.children) {
    for (var i = 0; i < node.children.length; i++) {
      getTextHint(node.children[i], depth + 1, acc);
    }
  }
  return acc;
}

// Build a signature for a frame to detect changes (name, size, structure, text). Same order as getTopLevelFrameIds.
async function getFrameSignaturesForPage(page) {
  var frameIds = getTopLevelFrameIds(page);
  var sigs = [];
  for (var i = 0; i < frameIds.length; i++) {
    try {
      var frame = await figma.getNodeByIdAsync(frameIds[i]);
      if (!frame || frame.type !== 'FRAME') continue;
      if (typeof frame.loadAsync === 'function') await frame.loadAsync();
      var textParts = getTextHint(frame, 0, []);
      var textHint = textParts.join('|').slice(0, 500);
      sigs.push({
        id: frame.id,
        name: (frame.name || '').trim(),
        width: Math.round(frame.width),
        height: Math.round(frame.height),
        contentHint: getContentHint(frame),
        textHint: textHint
      });
    } catch (e) { /* skip */ }
  }
  return sigs;
}
function frameSignaturesEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) {
    var x = a[i];
    var y = b[i];
    if (!x || !y || x.id !== y.id || (x.name || '') !== (y.name || '') || x.width !== y.width || x.height !== y.height) return false;
    if (x.contentHint && y.contentHint && x.contentHint !== y.contentHint) return false;
    if (x.textHint && y.textHint && x.textHint !== y.textHint) return false;
  }
  return true;
}

function getAdaptiveCoverExportScales(frame) {
  var maxDim = Math.max(frame && frame.width ? frame.width : 0, frame && frame.height ? frame.height : 0);
  var area = (frame && frame.width ? frame.width : 0) * (frame && frame.height ? frame.height : 0);
  var scales = [0.75, 0.5, 0.35, 0.25, 0.18];
  if (maxDim >= 12000 || area >= 90000000) return [0.18, 0.14, 0.1];
  if (maxDim >= 9000 || area >= 45000000) return [0.25, 0.18, 0.14];
  if (maxDim >= 7000 || area >= 24000000) return [0.35, 0.25, 0.18];
  if (maxDim >= 5000 || area >= 12000000) return [0.5, 0.35, 0.25, 0.18];
  return scales;
}

async function exportFrameAsDataUrl(frame) {
  var scales = getAdaptiveCoverExportScales(frame);
  for (var i = 0; i < scales.length; i++) {
    try {
      var bytes = await frame.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: scales[i] } });
      var dataUrl = 'data:image/png;base64,' + figma.base64Encode(bytes);
      if (dataUrl && dataUrl.length <= 4 * 1024 * 1024) return dataUrl;
    } catch (e) {}
  }
  return null;
}

// Same cover as plugin UI (prefer explicit Cover page/frame, otherwise stable file order). Used for get-file-thumbnail and create-index cover.
async function getCoverImageDataUrl() {
  await figma.loadAllPagesAsync();
  var pages = figma.root.children.filter(function (p) { return p.type === 'PAGE' && p.name !== 'FigDex'; });
  var coverPage = pages.find(function (p) { return (p.name || '').trim().toLowerCase() === 'cover'; }) || null;
  var pagesToTry = [];
  if (coverPage) pagesToTry.push(coverPage);
  pages.forEach(function (p) { if (!pagesToTry.some(function (t) { return t.id === p.id; })) pagesToTry.push(p); });
  if (pagesToTry.length === 0) return null;
  var framesToTry = [];
  for (var i = 0; i < pagesToTry.length; i++) {
    var page = pagesToTry[i];
    try { if (typeof page.loadAsync === 'function') await page.loadAsync(); } catch (e) {}
    // Use same top-level frames as index (direct FRAME children of Page or Section). Auto-layout frames count the same as regular frames.
    var pageFrames = getTopLevelFrameNodes(page);
    if (pageFrames.length > 0) { framesToTry = pageFrames; break; }
  }
  if (framesToTry.length === 0) return null;
  framesToTry = framesToTry.filter(function (f) { return (f.width || 0) >= 10 && (f.height || 0) >= 10 && f.visible !== false; });
  var explicitCover = !!coverPage;
  var frameToExport = framesToTry.find(function (f) { return (f.name || '').trim().toLowerCase() === 'cover'; });
  if (frameToExport) explicitCover = true;
  if (!frameToExport) {
    framesToTry.sort(function (a, b) { return (b.width * b.height) - (a.width * a.height); });
    frameToExport = framesToTry[0];
  }
  try { if (typeof frameToExport.loadAsync === 'function') await frameToExport.loadAsync(); } catch (e) {}
  var dataUrl = await exportFrameAsDataUrl(frameToExport);
  if (dataUrl) return dataUrl;
  if (!explicitCover) {
    try {
      var pageNode = coverPage || pagesToTry[0] || null;
      if (pageNode) {
        var pageBytes = await pageNode.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 0.25 } });
        var pageDataUrl = 'data:image/png;base64,' + figma.base64Encode(pageBytes);
        if (pageDataUrl && pageDataUrl.length <= 4 * 1024 * 1024) return pageDataUrl;
      }
    } catch (e) {}
  }
  return null;
}

// --- Bootstrap: load storage and send to UI ---
function sendStoredIdentityToUI(webToken, webUser) {
  if (mockConnectedIdentity) {
    postIdentityToUI('mock_token_' + Date.now(), { email: 'mock@figdex.local', name: 'Mock User' });
  } else if (webToken && typeof webToken === 'string' && webToken.length >= 10) {
    // Token alone is enough for indexing; UI needs minimal user for "Connected" display
    var user = webUser && typeof webUser === 'object' ? webUser : { id: 'connected', email: 'Account connected' };
    postIdentityToUI(webToken, user);
  } else {
    postIdentityToUI(null, null);
  }
}

async function clearStoredWebIdentity() {
  await setStored(STORAGE_KEYS.WEB_TOKEN, null);
  await setStored(STORAGE_KEYS.WEB_USER, null);
  postIdentityToUI(null, null);
  figma.ui.postMessage({ type: 'WEB_ACCOUNT_LIMITS_LOADED', limits: null });
}

async function refreshStoredWebUser(webToken) {
  if (!webToken || typeof webToken !== 'string' || webToken.length < 10) return null;
  try {
    var validateRes = await fetchWithTimeout('https://www.figdex.com/api/validate-api-key', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + webToken }
    });
    if (!validateRes.ok) {
      if (validateRes.status === 401 || validateRes.status === 404) {
        await clearStoredWebIdentity();
      }
      return null;
    }
    var validateData = await validateRes.json();
    if (!validateData || !validateData.user || typeof validateData.user !== 'object') return null;
    await setStored(STORAGE_KEYS.WEB_USER, validateData.user);
    return validateData.user;
  } catch (e) {
    return null;
  }
}

async function getServerIndexStatus(fileKey, webToken, anonId) {
  if (!fileKey || typeof fileKey !== 'string') return null;
  try {
    var url = 'https://www.figdex.com/api/file-index-status?fileKey=' + encodeURIComponent(fileKey);
    var headers = {};
    if (webToken && typeof webToken === 'string' && webToken.length >= 10) {
      headers['Authorization'] = 'Bearer ' + webToken;
    } else if (anonId && typeof anonId === 'string') {
      url += '&anonId=' + encodeURIComponent(anonId);
    } else {
      return null;
    }

    var response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: headers
    });
    if (!response || !response.ok) return null;
    var payload = await response.json();
    if (!payload || !payload.success) return null;
    return {
      exists: !!payload.exists,
      owner: payload.owner || null,
      indexedPageIds: Array.isArray(payload.indexedPageIds) ? payload.indexedPageIds.map(function (id) { return String(id); }) : null
    };
  } catch (e) {
    return null;
  }
}

async function removeIndexedPagesFromServer(fileKey, pageIds, webToken, anonId) {
  if (!fileKey || typeof fileKey !== 'string') throw new Error('Missing file key');
  var normalizedPageIds = Array.isArray(pageIds)
    ? pageIds.map(function (pageId) { return String(pageId || '').trim(); }).filter(Boolean)
    : [];
  if (normalizedPageIds.length === 0) throw new Error('No pages selected for removal');

  var headers = { 'Content-Type': 'application/json' };
  var body = {
    fileKey: fileKey,
    pageIds: normalizedPageIds
  };

  if (webToken && typeof webToken === 'string' && webToken.length >= 10) {
    headers['Authorization'] = 'Bearer ' + webToken;
  } else if (anonId && typeof anonId === 'string') {
    body.anonId = anonId;
  } else {
    throw new Error('Missing account token or anonId');
  }

  var response = await fetchWithTimeout('https://www.figdex.com/api/remove-indexed-pages', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });
  var payload = null;
  try { payload = await response.json(); } catch (e) { payload = null; }
  if (!response.ok || !payload || !payload.success) {
    throw new Error(payload && payload.error ? String(payload.error) : 'Failed to remove indexed page');
  }
  return {
    removedPageIds: Array.isArray(payload.removedPageIds) ? payload.removedPageIds.map(function (pageId) { return String(pageId); }).filter(Boolean) : [],
    removedPagesCount: typeof payload.removedPagesCount === 'number' ? payload.removedPagesCount : 0,
    removedFramesCount: typeof payload.removedFramesCount === 'number' ? payload.removedFramesCount : 0,
    fileDeleted: !!payload.fileDeleted
  };
}

async function loadUserLimitsToUI(webToken) {
  if (!webToken || typeof webToken !== 'string' || webToken.length < 10) {
    figma.ui.postMessage({ type: 'WEB_ACCOUNT_LIMITS_LOADED', limits: null });
    return null;
  }
  try {
    var limitsRes = await fetchWithTimeout('https://www.figdex.com/api/user/limits', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + webToken }
    });
    if (!limitsRes.ok) {
      if (limitsRes.status === 401 || limitsRes.status === 404) {
        await clearStoredWebIdentity();
      }
      return null;
    }
    var limitsJson = await limitsRes.json();
    var limits = limitsJson && limitsJson.limits ? limitsJson.limits : null;
    figma.ui.postMessage({ type: 'WEB_ACCOUNT_LIMITS_LOADED', limits: limits });
    return limits;
  } catch (e) {
    return null;
  }
}
(async function bootstrap() {
  await migrateDocumentScopedStateToReliableFileKey();
  var resolvedInitialFile = await resolveCurrentFileKey();
  var savedKey = resolvedInitialFile.fileKey;
  globalFileKeySource = resolvedInitialFile.source || 'none';
  pluginTrace('Plugin loaded', {
    pluginVersion: PLUGIN_VERSION,
    documentId: figma.root.id || rootId || '0:0',
    fileName: figma.root.name || 'Untitled',
    fileKeySource: globalFileKeySource,
    hasFileKey: !!savedKey
  });
  if (!savedKey) {
    pluginWarn('No saved file link for current document', {
      source: 'none',
      hasFileKey: false,
      fileName: figma.root.name || 'Untitled'
    });
  }
  if (savedKey) {
    globalFileKey = savedKey;
    sessionFileKey = savedKey;
    postFileKeyToUI(savedKey, globalFileKeySource);
  }
  var webToken = await getStored(STORAGE_KEYS.WEB_TOKEN, null);
  var webUser = await getStored(STORAGE_KEYS.WEB_USER, null);
  // One-time migration: token used to be stored per-document; move to global key if found
  if ((!webToken || !webUser) && (figma.root.id || '0:0')) {
    try {
      var docKey = 'figdex_' + getDocumentScopeId() + '_';
      var oldToken = await figma.clientStorage.getAsync(docKey + 'webToken');
      var oldUser = await figma.clientStorage.getAsync(docKey + 'webUser');
      if (oldToken && oldUser) {
        await setStored(STORAGE_KEYS.WEB_TOKEN, oldToken);
        await setStored(STORAGE_KEYS.WEB_USER, oldUser);
        webToken = oldToken;
        webUser = oldUser;
      }
    } catch (e) { /* ignore */ }
  }
  sendStoredIdentityToUI(webToken, webUser);
  if (webToken) {
    setTimeout(function () { loadUserLimitsToUI(webToken); }, 1500);
  }
  webToken = await getStored(STORAGE_KEYS.WEB_TOKEN, null);
  webUser = await getStored(STORAGE_KEYS.WEB_USER, null);
  var anonId = await getOrCreateAnonId();
  figma.ui.postMessage({ type: 'TELEMETRY_ANON_ID', anonId: anonId });
  await sendPluginTelemetryEvent('plugin_loaded', {
    documentId: figma.root.id || rootId || '0:0',
    fileName: figma.root.name || 'Untitled',
    fileKeySource: globalFileKeySource || 'none',
  });
  if (webToken && typeof webToken === 'string' && anonId) {
    try {
      var br = await fetch('https://www.figdex.com/api/claim/by-anon-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + webToken },
        body: JSON.stringify({ anonId: anonId })
      });
      var bd = br.ok ? await br.json() : {};
      if (bd.claimed > 0) {
        debugLog('[FigDex] bootstrap claim_by_anon_id claimed=' + bd.claimed);
      }
    } catch (_) {}
  }
  // Restore last selected pages for this document so page selection survives reload
  try {
    var savedSelectedPages = await getStored(STORAGE_KEYS.SELECTED_PAGES, null);
    if (Array.isArray(savedSelectedPages) && savedSelectedPages.length > 0) {
      figma.ui.postMessage({ type: 'set-selected-pages', pages: savedSelectedPages });
    }
  } catch (e) { /* ignore */ }
  // Resend after delay so UI gets identity if it missed the first message (race on load)
  setTimeout(function () { sendStoredIdentityToUI(webToken, webUser); }, 400);
  setTimeout(function () { sendStoredIdentityToUI(webToken, webUser); }, 1200);
  setTimeout(function () { loadUserLimitsToUI(webToken); }, 700);
  setTimeout(function () {
    getOrCreateAnonId().then(function (id) { figma.ui.postMessage({ type: 'TELEMETRY_ANON_ID', anonId: id }); });
  }, 500);
})();

async function getOrCreateAnonId() {
  var id = await getStored(STORAGE_KEYS.ANON_ID, null);
  if (!id || typeof id !== 'string') {
    id = cryptoRandomString() + cryptoRandomString();
    await setStored(STORAGE_KEYS.ANON_ID, id);
  }
  return id;
}

// --- Single message handler ---
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'UI_STATE_CHANGED') {
    figma.ui.postMessage({ type: 'UI_RENDER', payload: { state: msg.state, model: msg.model || {} } });
    return;
  }
  if (msg.type === 'set-file-key') {
    globalFileKey = msg.fileKey || '';
    sessionFileKey = globalFileKey;
    globalFileKeySource = msg.source || (globalFileKey ? 'manual' : 'none');
    pluginTrace(globalFileKey ? 'File key saved from UI' : 'File key cleared from UI', {
      source: globalFileKeySource,
      hasFileKey: !!globalFileKey
    });
    await setStored(STORAGE_KEYS.FILE_KEY, globalFileKey);
    await setStored(STORAGE_KEYS.FILE_NAME, msg.fileName != null ? msg.fileName : (figma.root.name || 'Untitled'));
    return;
  }
  if (msg.type === 'get-file-key') {
    var resolvedFileKey = await resolveCurrentFileKey();
    globalFileKeySource = resolvedFileKey.source || 'none';
    pluginTrace('UI requested file key', {
      source: globalFileKeySource,
      hasFileKey: !!resolvedFileKey.fileKey
    });
    postFileKeyToUI(resolvedFileKey.fileKey || '', globalFileKeySource);
    return;
  }
  if (msg.type === 'get_anon_id') {
    var anonId = await getOrCreateAnonId();
    figma.ui.postMessage({ type: 'TELEMETRY_ANON_ID', anonId: anonId });
    return;
  }
  if (msg.type === 'get-has-ever-indexed') {
    var hasEver = await getStored(STORAGE_KEYS.HAS_EVER_INDEXED, false);
    figma.ui.postMessage({ type: 'HAS_EVER_INDEXED', hasEverCompletedIndex: !!hasEver });
    return;
  }
  if (msg.type === 'refresh-pages' || msg.type === 'get-pages') {
    var refreshStartedAt = Date.now();
    if (pagesRefreshInFlight) {
      pluginTrace('Skipping pages refresh because another refresh is already in flight', {
        source: globalFileKeySource || 'none'
      });
      return;
    }
    if (msg.type === 'refresh-pages' && (refreshStartedAt - lastPagesRefreshHandledAt) < 5000) {
      pluginTrace('Skipping duplicate pages refresh because it arrived too soon', {
        source: globalFileKeySource || 'none',
        elapsedMs: refreshStartedAt - lastPagesRefreshHandledAt
      });
      return;
    }
    pagesRefreshInFlight = true;
    try {
      var resolvedRefreshFileKey = await resolveCurrentFileKey();
      globalFileKeySource = resolvedRefreshFileKey.source || globalFileKeySource || 'none';
      pluginTrace('Refreshing pages', {
        source: globalFileKeySource,
        hasFileKey: !!resolvedRefreshFileKey.fileKey
      });
      if (!resolvedRefreshFileKey.fileKey) {
        pluginWarn('Pages refresh is using manual-link mode without a saved file link', {
          source: 'none',
          hasFileKey: false
        });
      }
      if (resolvedRefreshFileKey.fileKey && resolvedRefreshFileKey.fileKey !== globalFileKey) {
        globalFileKey = resolvedRefreshFileKey.fileKey;
      }
      if (resolvedRefreshFileKey.fileKey && resolvedRefreshFileKey.fileKey !== sessionFileKey) {
        sessionFileKey = resolvedRefreshFileKey.fileKey;
      }
      await figma.loadAllPagesAsync();
      const allPages = figma.root.children
        .filter(p => p.type === 'PAGE' && p.name !== 'FigDex')
        .map(p => ({
          id: p.id,
          name: p.name,
          frameCount: getTopLevelFrameIds(p).length,
          hasFrames: p.children && p.children.some(n => n.type === 'FRAME' || (n.type === 'SECTION' && n.children && n.children.some(c => c.type === 'FRAME'))),
          isIndexPage: p.name === 'Frame-Index',
          isCoverPage: (p.name || '').trim().toLowerCase() === 'cover'
        }));
    // Use stored indexed pages metadata (per document) to mark pages that were already indexed
    let indexedMeta = [];
    try { indexedMeta = await getStored(STORAGE_KEYS.INDEXED_PAGES, []); } catch (e) { indexedMeta = []; }
    var serverIndexedPageIdMap = {};
    if (globalFileKey) {
      try {
        var tokenForIndexState = await getStored(STORAGE_KEYS.WEB_TOKEN, null);
        var anonIdForIndexState = await getStored(STORAGE_KEYS.ANON_ID, null);
        var serverIndexState = await getServerIndexStatus(globalFileKey, tokenForIndexState, anonIdForIndexState);
        if (serverIndexState && serverIndexState.exists === false) {
          indexedMeta = [];
          await setStored(STORAGE_KEYS.INDEXED_PAGES, []);
        } else if (serverIndexState && serverIndexState.exists && Array.isArray(serverIndexState.indexedPageIds)) {
          var allowedPageIds = {};
          for (var spi = 0; spi < serverIndexState.indexedPageIds.length; spi++) {
            var indexedPageId = String(serverIndexState.indexedPageIds[spi]);
            allowedPageIds[indexedPageId] = true;
            serverIndexedPageIdMap[indexedPageId] = true;
          }
          var reconciledMeta = Array.isArray(indexedMeta)
            ? indexedMeta.filter(function (m) { return m && m.pageId && !!allowedPageIds[String(m.pageId)]; })
            : [];
          if (reconciledMeta.length !== (Array.isArray(indexedMeta) ? indexedMeta.length : 0)) {
            indexedMeta = reconciledMeta;
            await setStored(STORAGE_KEYS.INDEXED_PAGES, reconciledMeta);
          }
        }
      } catch (e) {}
    }
      const metaByPage = Array.isArray(indexedMeta) ? Object.fromEntries(indexedMeta.map(m => [m.pageId, m])) : {};
      const pages = [];
      for (var pi = 0; pi < allPages.length; pi++) {
        var p = allPages[pi];
        var status = 'not_indexed';
        var icon = '➕';
        if (!p.hasFrames) {
          status = 'folder';
          icon = '📁';
        } else if (p.isIndexPage) {
          status = 'index_page';
          icon = '📄';
        } else if (metaByPage[p.id] || serverIndexedPageIdMap[p.id]) {
          // Keep page loading fast: existence is enough for refresh.
          // Change detection still happens during indexing for the selected pages.
          status = 'up_to_date';
          icon = '✅';
        }
        pages.push({
          id: p.id,
          name: p.name,
          frameCount: typeof p.frameCount === 'number' ? p.frameCount : 0,
          hasFrames: p.hasFrames,
          displayName: p.name,
          isFolder: !p.hasFrames,
          isIndexPage: p.isIndexPage,
          isCoverPage: p.isCoverPage,
          status: status,
          icon: icon
        });
      }
      var savedSelectedIds = null;
      try { savedSelectedIds = await getStored(STORAGE_KEYS.SELECTED_PAGES, null); } catch (e) { savedSelectedIds = null; }
      var hasSavedSelectedIds = Array.isArray(savedSelectedIds);
      if (!hasSavedSelectedIds) savedSelectedIds = [];
      var pageMessage = { type: 'pages', pages: pages };
      if (hasSavedSelectedIds) {
        pageMessage.selectedPageIds = savedSelectedIds;
      }
      var nextPayloadSignature = createPagesPayloadSignature(pageMessage);
      if (nextPayloadSignature && nextPayloadSignature === lastPagesPayloadSignature) {
        pluginTrace('Skipping pages UI update because payload did not change', {
          source: globalFileKeySource,
          hasFileKey: !!resolvedRefreshFileKey.fileKey
        });
      } else {
        postToUI(pageMessage);
        lastPagesPayloadSignature = nextPayloadSignature;
      }
      lastPagesRefreshHandledAt = refreshStartedAt;
      return;
    } finally {
      pagesRefreshInFlight = false;
    }
  }
  if (msg.type === 'save-web-system-token') {
    await setStored(STORAGE_KEYS.WEB_TOKEN, msg.token);
    if (msg.token && !(await getStored(STORAGE_KEYS.WEB_USER, null))) {
      await setStored(STORAGE_KEYS.WEB_USER, { id: 'connected', email: 'Account connected' });
    }
    sendStoredIdentityToUI(msg.token, await getStored(STORAGE_KEYS.WEB_USER, null));
    return;
  }
  if (msg.type === 'save-web-system-user') {
    await setStored(STORAGE_KEYS.WEB_USER, msg.user);
    return;
  }
  if (msg.type === 'save-selected-pages') {
    await setStored(STORAGE_KEYS.SELECTED_PAGES, msg.pages || []);
    return;
  }
  if (msg.type === 'repair-gallery-pages') {
    postToUI({ type: 'repair-gallery-pages-status', status: 'working' });
    try {
      var repairToken = await getStored(STORAGE_KEYS.WEB_TOKEN, null);
      var resolvedRepairFileKey = await resolveCurrentFileKey();
      var repairFileKey = resolvedRepairFileKey.fileKey || globalFileKey || '';
      if (!repairFileKey) {
        throw new Error('Save the file link before running repair.');
      }
      var repairResult = await repairGalleryPagesOnServer(repairFileKey, repairToken);
      pluginTrace('Gallery repair completed', {
        fileKeySource: resolvedRepairFileKey.source || globalFileKeySource || 'none',
        fileKey: repairFileKey,
        pageMetaCount: repairResult && typeof repairResult.pageMetaCount === 'number' ? repairResult.pageMetaCount : null,
        updatedPagesCount: repairResult && typeof repairResult.updatedPagesCount === 'number' ? repairResult.updatedPagesCount : null
      });
      figma.notify('Gallery repair completed');
      postToUI({ type: 'repair-gallery-pages-status', status: 'done' });
      lastPagesRefreshHandledAt = 0;
      await figma.ui.onmessage({ type: 'refresh-pages' });
    } catch (repairError) {
      var repairMessage = repairError && repairError.message ? String(repairError.message) : 'Failed to repair gallery pages';
      pluginError('Gallery repair failed', {
        message: repairMessage
      });
      figma.notify(repairMessage, { error: true });
      postToUI({ type: 'repair-gallery-pages-status', status: 'error', message: repairMessage });
    }
    return;
  }
  if (msg.type === 'clear-storage') {
    var keysToClear = Object.values(STORAGE_KEYS);
    for (const k of keysToClear) {
      try { await figma.clientStorage.deleteAsync(storageKey(k)); } catch (e) { console.warn('clear-storage:', k, e); }
    }
    await deleteCurrentDocumentLegacyState();
    globalFileKey = '';
    sessionFileKey = '';
    globalFileKeySource = 'none';
    postFileKeyToUI('', 'none');
    postIdentityToUI(null, null);
    figma.ui.postMessage({ type: 'WEB_ACCOUNT_LIMITS_LOADED', limits: null });
    return;
  }
  if (msg.type === 'clear-indexed-pages') {
    try { await figma.clientStorage.deleteAsync(storageKey(STORAGE_KEYS.INDEXED_PAGES)); } catch (e) { console.warn('clear-indexed-pages:', e); }
    figma.notify('Local index cleared — pages will show as not indexed');
    figma.ui.postMessage({ type: 'refresh-pages' });
    return;
  }
  if (msg.type === 'remove-indexed-page') {
    var pageIdToRemove = typeof msg.pageId === 'string' ? msg.pageId.trim() : '';
    var pageNameToRemove = typeof msg.pageName === 'string' ? msg.pageName.trim() : '';
    var resolvedRemovalFileKey = await resolveCurrentFileKey();
    var removalFileKey = resolvedRemovalFileKey.fileKey || globalFileKey || '';
    var removalToken = await getStored(STORAGE_KEYS.WEB_TOKEN, null);
    var removalAnonId = await getStored(STORAGE_KEYS.ANON_ID, null);
    if (!removalFileKey) {
      figma.notify('Save the file link before removing indexed pages', { error: true });
      return;
    }
    if (!pageIdToRemove) {
      figma.notify('Missing page id for removal', { error: true });
      return;
    }
    pluginTrace('Removing indexed page', {
      fileKeySource: resolvedRemovalFileKey.source || globalFileKeySource || 'none',
      pageId: pageIdToRemove,
      pageName: pageNameToRemove || null
    });
    try {
      var removalResult = await removeIndexedPagesFromServer(removalFileKey, [pageIdToRemove], removalToken, removalAnonId);
      var indexedMetaAfterRemoval = await getStored(STORAGE_KEYS.INDEXED_PAGES, []);
      if (Array.isArray(indexedMetaAfterRemoval)) {
        indexedMetaAfterRemoval = indexedMetaAfterRemoval.filter(function (entry) {
          return entry && String(entry.pageId || '') !== pageIdToRemove;
        });
        await setStored(STORAGE_KEYS.INDEXED_PAGES, indexedMetaAfterRemoval);
      }
      var selectedPagesAfterRemoval = await getStored(STORAGE_KEYS.SELECTED_PAGES, []);
      if (Array.isArray(selectedPagesAfterRemoval) && selectedPagesAfterRemoval.indexOf(pageIdToRemove) !== -1) {
        selectedPagesAfterRemoval = selectedPagesAfterRemoval.filter(function (pageId) { return pageId !== pageIdToRemove; });
        await setStored(STORAGE_KEYS.SELECTED_PAGES, selectedPagesAfterRemoval);
        figma.ui.postMessage({ type: 'set-selected-pages', pages: selectedPagesAfterRemoval });
      }
      await sendPluginTelemetryEvent('index_page_removed', {
        fileKeySource: resolvedRemovalFileKey.source || globalFileKeySource || 'none',
        pageId: pageIdToRemove,
        pageName: pageNameToRemove || null,
        removedPagesCount: removalResult.removedPagesCount,
        removedFramesCount: removalResult.removedFramesCount,
        fileDeleted: removalResult.fileDeleted
      });
      figma.notify(
        removalResult.removedPagesCount > 0
          ? 'Removed from FigDex' + (pageNameToRemove ? ' — ' + pageNameToRemove : '')
          : 'Nothing to remove for this page'
      );
      lastPagesRefreshHandledAt = 0;
      await figma.ui.onmessage({ type: 'refresh-pages' });
      figma.ui.postMessage({ type: 'pages-index-removed', pageIds: [pageIdToRemove] });
    } catch (error) {
      pluginError('Failed to remove indexed page', {
        pageId: pageIdToRemove,
        pageName: pageNameToRemove || null,
        message: error && error.message ? String(error.message) : 'Unknown error'
      });
      figma.notify('Failed to remove indexed page', { error: true });
    }
    return;
  }
  if (msg.type === 'UI_OPEN_FIGDEX_WEB_UPGRADE') {
    const connectNonce = cryptoRandomString();
    const docId = figma.root.id || rootId || '0:0';
    const anonId = await getOrCreateAnonId();
    await setStored(STORAGE_KEYS.CONNECT_NONCE_DATA, { nonce: connectNonce, createdAt: Date.now() });
    let connectUrl = 'https://www.figdex.com/plugin-connect?nonce=' + encodeURIComponent(connectNonce) + '&docId=' + encodeURIComponent(docId) + '&mode=upgrade&anonId=' + encodeURIComponent(anonId);
    figma.ui.postMessage({ type: 'OPEN_FIGDEX_WEB', url: connectUrl });
    debugLog('[FigDex] poll_start upgrade');
    const POLL_INTERVAL_MS = 2000;
    const POLL_MAX_MS = 120000;
    const pollStart = Date.now();
    const doPoll = async () => {
      if (Date.now() - pollStart >= POLL_MAX_MS) {
        debugLog('[FigDex] poll_timeout');
        figma.ui.postMessage({ type: 'CONNECT_TIMEOUT' });
        return;
      }
      try {
        const res = await fetch('https://www.figdex.com/api/plugin-connect/status?nonce=' + encodeURIComponent(connectNonce));
        const data = res.ok ? await res.json() : {};
        if (data.ready === true && data.token && (data.user || data.userId)) {
          debugLog('[FigDex] poll_success');
          const connectedUser = typeof data.user === 'object' && data.user ? data.user : (typeof data.userId === 'object' ? data.userId : { id: data.userId });
          await setStored(STORAGE_KEYS.WEB_TOKEN, data.token);
          await setStored(STORAGE_KEYS.WEB_USER, connectedUser);
          try {
            var claimRes = await fetch('https://www.figdex.com/api/claim/by-anon-id', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + data.token },
              body: JSON.stringify({ anonId: anonId })
            });
            var claimData = claimRes.ok ? await claimRes.json() : {};
            if (claimData.claimed > 0) {
              debugLog('[FigDex] claim_by_anon_id claimed=' + claimData.claimed);
            }
          } catch (_) {}
          postIdentityToUI(data.token, connectedUser);
          await loadUserLimitsToUI(data.token);
          return;
        }
        debugLog('[FigDex] poll_tick');
      } catch (e) { debugLog('[FigDex] poll_tick'); }
      setTimeout(doPoll, POLL_INTERVAL_MS);
    };
    setTimeout(doPoll, POLL_INTERVAL_MS);
    return;
  }
  if (msg.type === 'UI_OPEN_FIGDEX_WEB') {
    const connectNonce = cryptoRandomString();
    const docId = figma.root.id || rootId || '0:0';
    await setStored(STORAGE_KEYS.CONNECT_NONCE_DATA, { nonce: connectNonce, createdAt: Date.now() });
    let connectUrl = 'https://www.figdex.com/plugin-connect?nonce=' + encodeURIComponent(connectNonce) + '&docId=' + encodeURIComponent(docId);
    const token = await getStored(STORAGE_KEYS.WEB_TOKEN, null);
    if (token && typeof token === 'string') {
      try {
        const res = await fetch('https://www.figdex.com/api/plugin-connect/login-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
        });
        const data = res.ok ? await res.json() : {};
        if (data && data.loginToken) {
          connectUrl += '&loginToken=' + encodeURIComponent(data.loginToken);
        }
      } catch (e) { /* ignore; open without loginToken */ }
    }
    figma.ui.postMessage({ type: 'OPEN_FIGDEX_WEB', url: connectUrl });
    debugLog('[FigDex] poll_start');
    const POLL_INTERVAL_MS = 2000;
    const POLL_MAX_MS = 120000;
    const pollStart = Date.now();
    const doPoll = async () => {
      if (Date.now() - pollStart >= POLL_MAX_MS) {
        debugLog('[FigDex] poll_timeout');
        figma.ui.postMessage({ type: 'CONNECT_TIMEOUT' });
        return;
      }
      try {
        const res = await fetch('https://www.figdex.com/api/plugin-connect/status?nonce=' + encodeURIComponent(connectNonce));
        const data = res.ok ? await res.json() : {};
        if (data.ready === true && data.token && (data.user || data.userId)) {
          debugLog('[FigDex] poll_success');
          const connectedUser = typeof data.user === 'object' && data.user ? data.user : (typeof data.userId === 'object' ? data.userId : { id: data.userId });
          await setStored(STORAGE_KEYS.WEB_TOKEN, data.token);
          await setStored(STORAGE_KEYS.WEB_USER, connectedUser);
          postIdentityToUI(data.token, connectedUser);
          await loadUserLimitsToUI(data.token);
          return;
        }
        debugLog('[FigDex] poll_tick');
      } catch (e) { debugLog('[FigDex] poll_tick'); }
      setTimeout(doPoll, POLL_INTERVAL_MS);
    };
    setTimeout(doPoll, POLL_INTERVAL_MS);
    return;
  }
  if (msg.type === 'get-file-thumbnail') {
    try {
      var dataUrl = await getCoverImageDataUrl();
      if (dataUrl) {
        postToUI({ type: 'file-thumbnail', thumbnailDataUrl: dataUrl });
      } else {
        postToUI({ type: 'file-thumbnail-error', error: 'No pages or frames found' });
      }
    } catch (error) {
      console.error('[code.js] get-file-thumbnail error:', error);
      postToUI({ type: 'file-thumbnail-error', error: error.message });
    }
    return;
  }
  if (msg.type === 'start-advanced') {
    try {
      activeIndexRunId = cryptoRandomString();
      activeIndexSessionId = null;
      lastLoggedIndexStage = '';
      activeIndexRunMetrics = createIndexRunMetrics();
      activeIndexRunStartedAt = Date.now();
      figma.notify('Preparing gallery...');
      var selectedIds = msg.selectedPages || [];
      pluginTrace('Index run started', {
        runId: activeIndexRunId,
        selectedPagesCount: Array.isArray(selectedIds) ? selectedIds.length : 0,
        fileKeySource: globalFileKeySource || 'none'
      });
      await sendPluginTelemetryEvent('index_run_started', {
        runId: activeIndexRunId,
        selectedPagesCount: Array.isArray(selectedIds) ? selectedIds.length : 0,
        fileKeySource: globalFileKeySource || 'none',
      });
      await setStored(STORAGE_KEYS.SELECTED_PAGES, selectedIds);
      const token = await getStored(STORAGE_KEYS.WEB_TOKEN, null);
      if (!isGuestMode) {
        var tokenValidation = await ensureValidIndexingToken(token);
        if (!tokenValidation.ok) {
          figma.notify(tokenValidation.message, { error: true });
          figma.ui.postMessage({ type: 'AUTH_EXPIRED', selectedPages: selectedIds });
          figma.ui.postMessage({ type: 'error', message: tokenValidation.message, code: 'AUTH_EXPIRED' });
          return;
        }
      }
      var storedDocKey = await getStored(STORAGE_KEYS.FILE_KEY, null);
      if (typeof storedDocKey !== 'string') storedDocKey = '';
      storedDocKey = storedDocKey ? storedDocKey.trim() : '';
      var fileKey = sessionFileKey || storedDocKey || '';
      if (fileKey && fileKey !== globalFileKey) {
        globalFileKey = fileKey;
      }
      const docId = figma.root.id || rootId || '0:0';
      const fileName = await getStored(STORAGE_KEYS.FILE_NAME, null) || figma.root.name || 'Untitled';
      if (!fileKey) {
        pluginWarn('Index run blocked: missing file key', {
          runId: activeIndexRunId,
          selectedPagesCount: Array.isArray(selectedIds) ? selectedIds.length : 0,
          fileKeySource: globalFileKeySource || 'none'
        });
        await sendPluginTelemetryEvent('index_run_blocked', {
          runId: activeIndexRunId,
          reason: 'missing_file_key',
          selectedPagesCount: Array.isArray(selectedIds) ? selectedIds.length : 0,
          fileKeySource: globalFileKeySource || 'none',
        });
        figma.notify('Link this file first', { error: true });
        figma.ui.postMessage({ type: 'error', message: 'Link this file first: paste the Figma file link in Step 1 and click Save.' });
        return;
      }
      var isGuestMode = !token || token.length < 10;
      figma.ui.postMessage({ type: 'upload-started' });
      await postIndexProgress('Loading Figma pages...', {
        selectedPagesCount: selectedIds.length,
        framesDone: 0,
      });
      await figma.loadAllPagesAsync();
      const filePageMeta = figma.root.children
        .filter(function (pageNode) {
          return pageNode && pageNode.type === 'PAGE' && pageNode.name !== 'FigDex' && pageNode.name !== 'Frame-Index';
        })
        .map(function (pageNode, pageIndex) {
          var pageName = String(pageNode.name || ('Page ' + (pageIndex + 1))).trim() || ('Page ' + (pageIndex + 1));
          return {
            id: pageNode.id,
            pageId: pageNode.id,
            name: pageName,
            pageName: pageName,
            sortOrder: pageIndex,
            frameCount: getTopLevelFrameIds(pageNode).length,
            hasFrames: pageHasIndexableFrames(pageNode)
          };
        });
      const allPages = filePageMeta.map(function (page) {
        return { id: page.id, name: page.name || 'Untitled', sortOrder: page.sortOrder };
      });
      const idToName = Object.fromEntries(allPages.map(p => [p.id, p.name]));
      const pageSortOrderById = Object.fromEntries(allPages.map(p => [p.id, p.sortOrder]));
      if (selectedIds.length === 0) {
        selectedIds = allPages.map(p => p.id);
        figma.notify('No pages selected — using all pages');
      }
      var coverPage = null;
      for (var api = 0; api < allPages.length; api++) {
        var allPage = allPages[api];
        if (((allPage.name || '').trim().toLowerCase()) === 'cover') {
          coverPage = allPage;
          break;
        }
      }
      var indexingPageIds = selectedIds.slice();
      var coverIndexedImplicitly = false;
      if (coverPage && indexingPageIds.indexOf(coverPage.id) < 0) {
        indexingPageIds.push(coverPage.id);
        coverIndexedImplicitly = true;
      }
      const selectedPages = indexingPageIds.map(id => ({
        id,
        name: idToName[id] || 'Page',
        sortOrder: typeof pageSortOrderById[id] === 'number' ? pageSortOrderById[id] : null
      }));
      if (coverIndexedImplicitly) {
        pluginTrace('Cover page added to indexing run', {
          runId: activeIndexRunId,
          coverPageId: coverPage.id,
          selectedPagesCount: selectedIds.length,
          effectiveSelectedPagesCount: indexingPageIds.length
        });
      }

      var guestAnonId = isGuestMode ? await getOrCreateAnonId() : null;
      if (isGuestMode && !guestAnonId) {
        figma.notify('Guest mode requires anonymous ID. Please try again.', { error: true });
        figma.ui.postMessage({ type: 'error', message: 'Guest mode failed. Please try again or connect your account.' });
        return;
      }

      // Load last indexed metadata to skip unchanged pages
      var indexedMeta = [];
      try { indexedMeta = await getStored(STORAGE_KEYS.INDEXED_PAGES, []); } catch (e) { indexedMeta = []; }
      if (!Array.isArray(indexedMeta)) indexedMeta = [];

      // Determine which selected pages have changes (dirty) — skip unchanged
      await postIndexProgress('Scanning selected pages for changes...', {
        selectedPagesCount: selectedIds.length,
        pageCount: indexingPageIds.length,
        framesDone: 0,
        pagesDone: 0,
      });
      var dirtyPageIds = [];
      var dirtyPageNodesById = {};
      var pageSignaturesById = {};
      var frameIdsByPageId = {};
      for (var di = 0; di < indexingPageIds.length; di++) {
        var pageNode = await figma.getNodeByIdAsync(indexingPageIds[di]);
        if (!pageNode || pageNode.type !== 'PAGE') continue;
        dirtyPageNodesById[pageNode.id] = pageNode;
        var currentSigs = await getFrameSignaturesForPage(pageNode);
        pageSignaturesById[pageNode.id] = currentSigs;
        var stored = indexedMeta.find(function (m) { return m.pageId === pageNode.id; });
        var storedSigs = stored && Array.isArray(stored.frameSignatures) ? stored.frameSignatures : null;
        var isCoverPage = !!coverPage && pageNode.id === coverPage.id;
        if (!isCoverPage && storedSigs && frameSignaturesEqual(currentSigs, storedSigs)) continue; // unchanged — skip
        dirtyPageIds.push(pageNode.id);
        frameIdsByPageId[pageNode.id] = getTopLevelFrameIds(pageNode);
        if (di === 0 || (di + 1) % 4 === 0 || di === indexingPageIds.length - 1) {
          postUploadProgressMessage({
            type: 'upload-progress',
            step: buildIndexProgressStep('Scanning selected pages for changes...', {
              pagesDone: di + 1,
              pageCount: indexingPageIds.length,
            }),
            framesDone: 0,
            pagesDone: di + 1,
            totalPages: indexingPageIds.length
          });
        }
      }
      await postIndexProgress(
        dirtyPageIds.length > 0 ? 'Found ' + dirtyPageIds.length + ' page(s) to update' : 'No page changes detected',
        {
          selectedPagesCount: selectedIds.length,
          pageCount: dirtyPageIds.length,
          framesDone: 0,
          pagesDone: 0,
        }
      );

      var dirtyFrameCount = 0;
      var dirtyPageFrameCounts = [];
      for (var dfi = 0; dfi < dirtyPageIds.length; dfi++) {
        var dirtyFrameIds = frameIdsByPageId[dirtyPageIds[dfi]];
        if (Array.isArray(dirtyFrameIds)) {
          dirtyFrameCount += dirtyFrameIds.length;
          dirtyPageFrameCounts.push(dirtyFrameIds.length);
        }
      }
      if (dirtyPageIds.length > 0) {
        var indexAdmission = evaluateIndexAdmission(dirtyPageFrameCounts);
        pluginTrace('Index admission evaluated', {
          runId: activeIndexRunId,
          selectedPagesCount: selectedIds.length,
          effectivePageCount: indexAdmission.pageCount,
          totalFrames: indexAdmission.totalFrames,
          maxPageFrames: indexAdmission.maxPageFrames,
          score: indexAdmission.score,
          shouldWarn: indexAdmission.shouldWarn,
          isDanger: indexAdmission.isDanger
        });
        if (indexAdmission.shouldWarn) {
          var admissionWarnMessage = indexAdmission.isDanger
            ? 'Very large indexing run detected — continuing anyway. This may take longer than usual.'
            : 'Large indexing run detected — continuing, but smaller batches will be more stable.';
          figma.notify(admissionWarnMessage, { timeout: 4000 });
        }
      }
      var pageBatches = dirtyPageIds.map(function (pageId) { return [pageId]; });
      if (pageBatches.length > 1) {
        pluginTrace('Page-by-page indexing mode enabled', {
          runId: activeIndexRunId,
          selectedPagesCount: selectedIds.length,
          dirtyPageCount: dirtyPageIds.length,
          dirtyFrameCount: dirtyFrameCount
        });
        await postIndexProgress(
          'Indexing pages one by one (' + dirtyPageIds.length + ' pages to update)',
          {
            selectedPagesCount: selectedIds.length,
            pageCount: dirtyPageIds.length,
            framesDone: 0,
          }
        );
      }

      // Pre-flight: check guest limits against the pages that will actually be uploaded.
      if (isGuestMode && guestAnonId) {
        await postIndexProgress('Checking guest plan limits...', {
          selectedPagesCount: selectedIds.length,
          pageCount: dirtyPageIds.length,
          framesDone: 0,
          totalFrames: dirtyFrameCount,
          pagesDone: 0,
        });
        var estimatedFrameCount = 0;
        for (var ei = 0; ei < dirtyPageIds.length; ei++) {
          var guestPageId = dirtyPageIds[ei];
          var guestFrameIds = frameIdsByPageId[guestPageId];
          if (Array.isArray(guestFrameIds)) estimatedFrameCount += guestFrameIds.length;
        }
        try {
          var checkRes = await fetchWithTimeout('https://www.figdex.com/api/create-index-from-figma', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source: 'figma-plugin',
              galleryOnly: true,
              action: 'check_limit',
              anonId: guestAnonId,
              fileKey: fileKey,
              docId: docId,
              fileName: fileName,
              estimatedFrameCount: estimatedFrameCount
            })
          });
          if (!checkRes.ok) {
            var errText = '';
            try { errText = await checkRes.text(); } catch (_) {}
            var errJson = null;
            try { errJson = errText ? JSON.parse(errText) : null; } catch (_) {}
            var errMsg = normalizeExternalErrorMessage(checkRes.status, errJson, errText, 'Could not verify limits. Please try again.');
            figma.notify(errMsg, { error: true });
            figma.ui.postMessage({ type: 'error', message: errMsg, code: errJson ? errJson.code : null, upgradeUrl: errJson ? errJson.upgradeUrl : null });
            return;
          }
        } catch (checkErr) {
          figma.notify('Could not verify limits. Please try again.', { error: true });
          figma.ui.postMessage({ type: 'error', message: 'Could not verify limits. Please try again.' });
          return;
        }
      }

      if (!isGuestMode && token && !FORCE_STORAGE_FIRST_UPLOADS) {
        await postIndexProgress('Checking account limits...', {
          selectedPagesCount: selectedIds.length,
          pageCount: dirtyPageIds.length,
          framesDone: 0,
          totalFrames: dirtyFrameCount,
          pagesDone: 0,
        });
        var estimatedConnectedFrameCount = 0;
        for (var cei = 0; cei < dirtyPageIds.length; cei++) {
          var connectedPageId = dirtyPageIds[cei];
          var connectedFrameIds = frameIdsByPageId[connectedPageId];
          if (Array.isArray(connectedFrameIds)) estimatedConnectedFrameCount += connectedFrameIds.length;
        }
        try {
          var connectedCheckRes = await fetchWithTimeout('https://www.figdex.com/api/create-index-from-figma', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
              source: 'figma-plugin',
              galleryOnly: true,
              action: 'check_limit',
              fileKey: fileKey,
              docId: docId,
              fileName: fileName,
              estimatedFrameCount: estimatedConnectedFrameCount
            })
          });
          if (!connectedCheckRes.ok) {
            var connectedErrText = '';
            try { connectedErrText = await connectedCheckRes.text(); } catch (_) {}
            var connectedErrJson = null;
            try { connectedErrJson = connectedErrText ? JSON.parse(connectedErrText) : null; } catch (_) {}
            var connectedErrMsg = normalizeExternalErrorMessage(connectedCheckRes.status, connectedErrJson, connectedErrText, 'Could not verify limits. Please try again.');
            figma.notify(connectedErrMsg, { error: true });
            figma.ui.postMessage({ type: 'error', message: connectedErrMsg, code: connectedErrJson ? connectedErrJson.code : null, upgradeUrl: connectedErrJson ? connectedErrJson.upgradeUrl : null });
            return;
          }
        } catch (connectedCheckErr) {
          figma.notify('Could not verify limits. Please try again.', { error: true });
          figma.ui.postMessage({ type: 'error', message: 'Could not verify limits. Please try again.' });
          return;
        }
      }

      await postIndexProgress('Preparing export…', {
        selectedPagesCount: selectedIds.length,
        pageCount: dirtyPageIds.length,
        framesDone: 0,
        totalFrames: dirtyFrameCount,
        pagesDone: 0,
      });

      // Same cover as plugin UI (only for first chunk). Fallback to first frame only if no explicit cover can be exported.
      var coverImageDataUrl = null;
      try {
        coverImageDataUrl = await getCoverImageDataUrl();
      } catch (e) {
        console.warn('[code.js] cover image error:', e);
      }
      if (coverImageDataUrl && coverImageDataUrl.length > 4 * 1024 * 1024) {
        console.warn('[code.js] cover image too large, omitting cover upload for this run');
        coverImageDataUrl = null;
      }
      const FRAME_EXPORT_CONCURRENCY = 2;
      var baseFileName = (fileName || '').trim() || 'Untitled';
      var useStorageFirstUpload = !isGuestMode && !!token && (FORCE_STORAGE_FIRST_UPLOADS || dirtyFrameCount >= STORAGE_FIRST_TRIGGER_FRAMES);
      if (activeIndexRunMetrics) {
        activeIndexRunMetrics.storageFirst = !!useStorageFirstUpload;
        activeIndexRunMetrics.selectedPagesCount = selectedIds.length;
        activeIndexRunMetrics.pageBatchCount = pageBatches.length;
        activeIndexRunMetrics.frameCount = dirtyFrameCount;
      }
      var storageFirstUploadSession = null;
      var storageFirstUploadedChunkPaths = [];
      var framesPerChunk = useStorageFirstUpload ? STORAGE_FIRST_FRAMES_PER_CHUNK : DIRECT_UPLOAD_FRAMES_PER_CHUNK;
      var chunkMaxBytes = useStorageFirstUpload ? STORAGE_FIRST_MAX_CHUNK_BYTES : DIRECT_UPLOAD_MAX_CHUNK_BYTES;
      var totalUploaded = 0;
      var completedPageIds = [];
      var completedFrameCount = 0;
      var lastViewToken = null;
      var totalUploadedChunks = 0;

      function buildLastChunkIndexByPageId(specs) {
        var indexByPageId = {};
        for (var specIndex = 0; specIndex < specs.length; specIndex++) {
          var specPages = specs[specIndex];
          for (var specPageIndex = 0; specPageIndex < specPages.length; specPageIndex++) {
            var specPage = specPages[specPageIndex];
            var specPageId = specPage.pageId || specPage.id;
            if (specPageId) indexByPageId[specPageId] = specIndex;
          }
        }
        return indexByPageId;
      }

      var pluginRunSessionId = 'sync_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      if (useStorageFirstUpload) {
        try {
          storageFirstUploadSession = await createStorageFirstUploadSession(token, fileKey, baseFileName, docId, filePageMeta, coverImageDataUrl);
          pluginTrace('Storage-first upload session created', {
            runId: activeIndexRunId,
            uploadId: storageFirstUploadSession && storageFirstUploadSession.uploadId ? storageFirstUploadSession.uploadId : null,
            selectedPagesCount: selectedIds.length,
            pageCount: pageBatches.length,
            frameCount: dirtyFrameCount,
            framesPerChunk: framesPerChunk,
            maxChunkBytes: chunkMaxBytes
          });
        } catch (storageSessionError) {
          var storageSessionMessage = storageSessionError && storageSessionError.message ? String(storageSessionError.message) : 'Failed to create upload session';
          if (activeIndexRunMetrics) activeIndexRunMetrics.failed = true;
          logIndexRunSummary({
            result: 'failed',
            completedPages: 0,
            completedFrames: 0,
            errorMessage: storageSessionMessage
          });
          figma.notify(storageSessionMessage, { error: true });
          figma.ui.postMessage({ type: 'error', message: storageSessionMessage });
          return;
        }
      }
      for (var batchCursor = 0; batchCursor < pageBatches.length; batchCursor++) {
        var currentPageIds = pageBatches[batchCursor];
        var allPageFrames = [];
        var newSignaturesByPage = {};
        try {
          for (var pi = 0; pi < currentPageIds.length; pi++) {
            var currentPageId = currentPageIds[pi];
            var page = dirtyPageNodesById[currentPageId] || await figma.getNodeByIdAsync(currentPageId);
            if (!page || page.type !== 'PAGE') continue;
            var frameIds = frameIdsByPageId[page.id] || getTopLevelFrameIds(page);
            var pageExportProfile = getPageExportProfile(frameIds.length);
            await postIndexProgress('Exporting page ' + (batchCursor + 1) + '/' + pageBatches.length + ': ' + (page.name || 'Untitled'), {
              selectedPagesCount: selectedIds.length,
              pageCount: dirtyPageIds.length,
              framesDone: totalUploaded,
              totalFrames: dirtyFrameCount,
              pagesDone: batchCursor,
            });
            if (!newSignaturesByPage[page.id]) newSignaturesByPage[page.id] = [];
            for (var fi = 0; fi < frameIds.length; fi += FRAME_EXPORT_CONCURRENCY) {
              var frameBatch = frameIds.slice(fi, fi + FRAME_EXPORT_CONCURRENCY);
              var batchResults = await Promise.all(frameBatch.map(async function (frameId, batchIndex) {
                try {
                  var frame = await figma.getNodeByIdAsync(frameId);
                  if (!frame || frame.type !== 'FRAME') return null;
                  if (typeof frame.loadAsync === 'function') await frame.loadAsync();
                  var w = Math.round(frame.width);
                  var h = Math.round(frame.height);
                  var sizeTag = w + 'x' + h;
                  var visibleTexts = collectVisibleTextsFromFrame(frame);
                  var ancestorNames = collectAncestorNames(frame);
                  var allTexts = [frame.name || ''].concat(ancestorNames, visibleTexts);
                  var textContent = allTexts.join(' ');
                  var searchTokens = buildSearchTokens(allTexts);
                  var sectionName = getSectionNameForFrame(frame);
                  var displayName = sectionName ? sectionName + ' / ' + (frame.name || 'Frame') : (frame.name || 'Frame');
                  var exportResult = await exportFrameImageData(frame, w, h, pageExportProfile);
                  var bytes = exportResult.bytes;
                  var b64 = figma.base64Encode(bytes);
                  var frameUrl = fileKey ? 'https://www.figma.com/file/' + fileKey + '?node-id=' + frame.id.replace(/:/g, '%3A') : '';
                  return {
                    localIndex: fi + batchIndex,
                    signature: { id: frame.id, name: (frame.name || '').trim(), width: w, height: h },
                    frameItem: {
                      id: frame.id,
                      name: displayName,
                      x: Math.round(frame.x),
                      y: Math.round(frame.y),
                      width: w,
                      height: h,
                      tags: [sizeTag],
                      url: frameUrl,
                      textContent: textContent,
                      searchTokens: searchTokens,
                      image: 'data:image/jpeg;base64,' + b64,
                      thumb_url: null
                    }
                  };
                } catch (err) {
                  return null;
                }
              }));

              batchResults
                .filter(function (entry) { return !!entry; })
                .sort(function (a, b) { return a.localIndex - b.localIndex; })
                .forEach(function (entry) {
                  newSignaturesByPage[page.id].push(entry.signature);
                  entry.frameItem.index = allPageFrames.length;
                  allPageFrames.push({ pageId: page.id, pageName: page.name || 'Page', frameItem: entry.frameItem });
                });

              postUploadProgressMessage({
                type: 'upload-progress',
                step: buildIndexProgressStep('Exporting current page...', {
                  pagesDone: batchCursor,
                  pageCount: pageBatches.length,
                  framesDone: totalUploaded + allPageFrames.length,
                  totalFrames: dirtyFrameCount,
                }),
                framesDone: totalUploaded + allPageFrames.length,
                totalFrames: dirtyFrameCount,
                pagesDone: batchCursor,
                totalPages: pageBatches.length
              });
              await new Promise(function (r) { setTimeout(r, 0); });
            }
          }
          if (allPageFrames.length === 0) {
            figma.notify('No top-level frames (direct Page frames or direct Section frames)', { error: true });
            figma.ui.postMessage({ type: 'error', message: 'No top-level frames found' });
            return;
          }
        } catch (payloadErr) {
          console.warn('[code.js] indexPayload collect error:', payloadErr);
          await sendPluginTelemetryEvent('index_run_failed', {
            runId: activeIndexRunId,
            stage: 'exporting',
            reason: 'collect_frames_failed',
            message: payloadErr && payloadErr.message ? String(payloadErr.message) : 'Failed to collect frames',
            selectedPagesCount: selectedIds.length,
            pageCount: currentPageIds.length,
          });
          figma.ui.postMessage({ type: 'error', message: 'Failed to collect frames' });
          return;
        }

        var chunkSpecs = [];
        var start = 0;
        while (start < allPageFrames.length) {
          var end = Math.min(start + framesPerChunk, allPageFrames.length);
          var slice = allPageFrames.slice(start, end);
          var pageMap = {};
          for (var si = 0; si < slice.length; si++) {
            var s = slice[si];
            if (!pageMap[s.pageId]) {
              pageMap[s.pageId] = {
                id: s.pageId,
                name: s.pageName,
                sortOrder: typeof pageSortOrderById[s.pageId] === 'number' ? pageSortOrderById[s.pageId] : null,
                frames: []
              };
            }
            pageMap[s.pageId].frames.push(s.frameItem);
          }
          var chunkPagesList = [];
          for (var k in pageMap) chunkPagesList.push(pageMap[k]);
          chunkSpecs.push(chunkPagesList);
          start = end;
        }

        chunkSpecs = normalizeChunkSpecsForRequestSize(chunkSpecs, {
          fileKey: fileKey,
          docId: docId,
          fileName: baseFileName,
          selectedPages: selectedPages,
          version: PLUGIN_VERSION,
          coverImageDataUrl: coverImageDataUrl,
          includeCover: !!coverImageDataUrl,
          includeSelectionMetadata: true,
          mergePages: true,
          replacePageIds: currentPageIds,
          anonId: isGuestMode && guestAnonId ? guestAnonId : null,
          maxBytes: chunkMaxBytes
        });

        var totalChunks = chunkSpecs.length;
        var res = null;
        var finalChunkError = null;
        for (var chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          totalChunks = chunkSpecs.length;
          var lastChunkIndexByPageId = buildLastChunkIndexByPageId(chunkSpecs);
          var chunkPages = chunkSpecs[chunkIndex];
          var chunkPayload = { pages: chunkPages };
          var replacePageIds = chunkPages.map(function (p) { return p.pageId || p.id; });
          var finalizePageIds = replacePageIds.filter(function (pageId) {
            return lastChunkIndexByPageId[pageId] === chunkIndex;
          });
          var chunkFileName = totalChunks > 1 ? baseFileName + ' (Page ' + (batchCursor + 1) + '/' + pageBatches.length + ' — Part ' + (chunkIndex + 1) + '/' + totalChunks + ')' : baseFileName;
          var body = {
            fileKey: fileKey,
            docId: docId,
            fileName: chunkFileName,
            chunkIndex: chunkIndex,
            totalChunks: totalChunks,
            pageBatchIndex: batchCursor,
            pageBatchCount: pageBatches.length,
            selectedPages: chunkIndex === 0 ? selectedPages : undefined,
            sessionId: activeIndexSessionId || undefined,
            source: 'figma-plugin',
            version: PLUGIN_VERSION,
            syncId: pluginRunSessionId,
            galleryOnly: true,
            imageQuality: 0.75,
            indexPayload: chunkPayload,
            coverImageDataUrl: chunkIndex === 0 ? coverImageDataUrl || undefined : undefined,
            finalizePageIds: finalizePageIds,
            mergePages: true,
            replacePageIds: replacePageIds
          };
          if (isGuestMode && guestAnonId) body.anonId = guestAnonId;
          var chunkFrameCount = chunkPages.reduce(function (s, p) { return s + (p.frames ? p.frames.length : 0); }, 0);
          pluginTrace('Chunk upload dispatch', {
            runId: activeIndexRunId,
            sessionId: activeIndexSessionId || null,
            uploadId: storageFirstUploadSession && storageFirstUploadSession.uploadId ? storageFirstUploadSession.uploadId : null,
            storageFirst: useStorageFirstUpload,
            pageBatchIndex: batchCursor + 1,
            pageBatchCount: pageBatches.length,
            chunkNumber: chunkIndex + 1,
            totalChunks: totalChunks,
            chunkFrameCount: chunkFrameCount,
            replacePageCount: replacePageIds.length,
            finalizePageCount: finalizePageIds.length
          });
          if (activeIndexRunMetrics) {
            activeIndexRunMetrics.chunkDispatches += 1;
            if (useStorageFirstUpload) activeIndexRunMetrics.appendRequests += 1;
            else activeIndexRunMetrics.legacyRequests += 1;
          }
          postUploadProgressMessage({
            type: 'upload-progress',
            step: buildIndexProgressStep(
              'Uploading page ' + (batchCursor + 1) + '/' + pageBatches.length + (totalChunks > 1 ? ' — part ' + (chunkIndex + 1) + '/' + totalChunks : ''),
              {
                pagesDone: batchCursor,
                pageCount: pageBatches.length,
                framesDone: totalUploaded,
                totalFrames: dirtyFrameCount,
              }
            ),
            framesDone: totalUploaded,
            totalFrames: dirtyFrameCount,
            pagesDone: batchCursor,
            totalPages: pageBatches.length
          });
          await logIndexStage('Uploading page ' + (batchCursor + 1) + '/' + pageBatches.length, {
            selectedPagesCount: selectedIds.length,
            pageCount: currentPageIds.length,
            frameCount: allPageFrames.length,
            chunkNumber: chunkIndex + 1,
            totalChunks: totalChunks,
          });
          var headers = { 'Content-Type': 'application/json' };
          if (!isGuestMode && token) headers['Authorization'] = 'Bearer ' + token;
          var chunkAttempt = null;
          var storageChunkPayload = {
            pages: chunkPages,
            fileKey: fileKey,
            fileName: baseFileName,
            uploadedAt: new Date().toISOString(),
            file_size: estimateJsonBytes(chunkPayload)
          };
          if (useStorageFirstUpload && storageFirstUploadSession && storageFirstUploadSession.appendUrl) {
            if (STORAGE_FIRST_USE_DIRECT_UPLOADS) {
              try {
                var signedChunkUpload = await createStorageFirstSignedChunkUpload(token, storageFirstUploadSession, {
                  pageBatchIndex: batchCursor,
                  pageBatchCount: pageBatches.length,
                  chunkNumber: chunkIndex + 1,
                  totalChunks: totalChunks
                });
                chunkAttempt = await postChunkWithRetry(signedChunkUpload.signedUrl, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'cache-control': 'max-age=3600'
                  },
                  body: JSON.stringify(storageChunkPayload)
                }, {
                  chunkNumber: chunkIndex + 1,
                  totalChunks: totalChunks,
                  framesDone: totalUploaded
                });
                if (chunkAttempt && chunkAttempt.ok && chunkAttempt.response && chunkAttempt.response.ok) {
                  storageFirstUploadedChunkPaths.push(signedChunkUpload.path);
                  if (activeIndexRunMetrics) activeIndexRunMetrics.directUploadRequests += 1;
                }
              } catch (signedUploadError) {
                pluginWarn('Storage-first signed upload setup failed, falling back to append', {
                  runId: activeIndexRunId,
                  uploadId: storageFirstUploadSession && storageFirstUploadSession.uploadId ? storageFirstUploadSession.uploadId : null,
                  pageBatchIndex: batchCursor + 1,
                  chunkNumber: chunkIndex + 1,
                  totalChunks: totalChunks,
                  message: signedUploadError && signedUploadError.message ? String(signedUploadError.message) : 'Unknown error'
                });
                chunkAttempt = null;
              }
              if (chunkAttempt && chunkAttempt.response && !chunkAttempt.response.ok) {
                pluginWarn('Storage-first direct upload failed, retrying via append fallback', {
                  runId: activeIndexRunId,
                  uploadId: storageFirstUploadSession && storageFirstUploadSession.uploadId ? storageFirstUploadSession.uploadId : null,
                  pageBatchIndex: batchCursor + 1,
                  chunkNumber: chunkIndex + 1,
                  totalChunks: totalChunks,
                  status: chunkAttempt.response.status
                });
              }
            }
            if (!chunkAttempt || !chunkAttempt.ok || !chunkAttempt.response || !chunkAttempt.response.ok) {
              chunkAttempt = await postChunkWithRetry('https://www.figdex.com' + storageFirstUploadSession.appendUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(storageChunkPayload)
              }, {
                chunkNumber: chunkIndex + 1,
                totalChunks: totalChunks,
                framesDone: totalUploaded
              });
            }
          } else {
            chunkAttempt = await postChunkWithRetry('https://www.figdex.com/api/create-index-from-figma', {
              method: 'POST',
              headers: headers,
              body: JSON.stringify(body)
            }, {
              chunkNumber: chunkIndex + 1,
              totalChunks: totalChunks,
              framesDone: totalUploaded
            });
          }
          res = chunkAttempt.response || null;
          finalChunkError = chunkAttempt.error || null;
          if ((!chunkAttempt.ok || !res || !res.ok) && !useStorageFirstUpload && res && res.status === 413) {
            var splitChunkSpecs = splitChunkPagesInHalf(chunkPages);
            if (splitChunkSpecs && splitChunkSpecs.length === 2) {
              chunkSpecs.splice(chunkIndex, 1, splitChunkSpecs[0], splitChunkSpecs[1]);
              totalChunks = chunkSpecs.length;
              chunkIndex -= 1;
              continue;
            }
          }
          if (!chunkAttempt.ok || !res || !res.ok) {
            break;
          }
          pluginTrace('Chunk upload succeeded', {
            runId: activeIndexRunId,
            sessionId: activeIndexSessionId || null,
            uploadId: storageFirstUploadSession && storageFirstUploadSession.uploadId ? storageFirstUploadSession.uploadId : null,
            storageFirst: useStorageFirstUpload,
            pageBatchIndex: batchCursor + 1,
            pageBatchCount: pageBatches.length,
            chunkNumber: chunkIndex + 1,
            totalChunks: totalChunks,
            chunkFrameCount: chunkFrameCount,
            totalUploadedAfterChunk: totalUploaded + chunkFrameCount
          });
          if (activeIndexRunMetrics) activeIndexRunMetrics.chunkSuccesses += 1;
          totalUploadedChunks += 1;
          totalUploaded += chunkFrameCount;
          try {
            var data = await res.json();
            if (useStorageFirstUpload && data && data.chunkPath && storageFirstUploadedChunkPaths.indexOf(data.chunkPath) < 0) {
              storageFirstUploadedChunkPaths.push(data.chunkPath);
            }
            if (!useStorageFirstUpload) {
              if (data && data.viewToken) lastViewToken = data.viewToken;
              if (data && data.sessionId && !activeIndexSessionId) activeIndexSessionId = data.sessionId;
            }
          } catch (_) {}
          if (chunkIndex < totalChunks - 1) await sleep(250);
        }
        if (totalChunks <= 0 || !res || !res.ok) {
          var errText = '';
          try { if (res && typeof res.text === 'function') errText = await res.text(); } catch (_) {}
          var errJson = null;
          try { errJson = errText ? JSON.parse(errText) : null; } catch (_) {}
          var errMsg = normalizeExternalErrorMessage(res ? res.status : null, errJson, errText, 'Index failed (' + ((res && res.status) || '') + ')');
          if (res && res.status === 401) {
            await clearStoredWebIdentity();
            figma.ui.postMessage({ type: 'AUTH_EXPIRED', selectedPages: selectedIds });
          }
          if ((!errJson || !errJson.error) && finalChunkError && finalChunkError.message && (!errText || errText.trim() === '')) errMsg = String(finalChunkError.message);
          if (activeIndexRunMetrics) activeIndexRunMetrics.failed = true;
          logIndexRunSummary({
            result: 'failed',
            completedPages: completedPageIds.length,
            completedFrames: completedFrameCount,
            errorMessage: errMsg
          });
          figma.notify('Stopped after ' + completedPageIds.length + ' completed page(s). ' + errMsg, { error: true });
          figma.ui.postMessage({ type: 'error', message: errMsg, code: errJson ? errJson.code : null, upgradeUrl: errJson ? errJson.upgradeUrl : null });
          return;
        }

        if (!useStorageFirstUpload) {
          indexedMeta = await applyLocalIndexedPageState(indexedMeta, currentPageIds, idToName, pageSignaturesById);
        }

        completedPageIds = completedPageIds.concat(currentPageIds);
        completedFrameCount += allPageFrames.length;
        if (!isGuestMode && token && activeIndexSessionId) {
          try {
            var sessionStatus = await fetchIndexSessionStatus(activeIndexSessionId, token);
            if (sessionStatus) {
              var sessionPagesDone = typeof sessionStatus.completed_pages === 'number' ? sessionStatus.completed_pages : completedPageIds.length;
              var sessionPagesTotal = typeof sessionStatus.total_pages === 'number' ? sessionStatus.total_pages : pageBatches.length;
              var sessionFramesDone = typeof sessionStatus.processed_frames === 'number' ? sessionStatus.processed_frames : completedFrameCount;
              var sessionFramesTotal = typeof sessionStatus.total_frames === 'number' ? sessionStatus.total_frames : dirtyFrameCount;
              await postIndexProgress(
                'Completed ' + sessionPagesDone + '/' + sessionPagesTotal + ' pages',
                {
                  selectedPagesCount: selectedIds.length,
                  pageCount: sessionPagesTotal,
                  framesDone: sessionFramesDone,
                  totalFrames: sessionFramesTotal,
                  pagesDone: sessionPagesDone,
                }
              );
            }
          } catch (_) {}
        }
      }

      if (useStorageFirstUpload && storageFirstUploadSession) {
        try {
          await postIndexProgress('Finalizing uploaded pages…', {
            selectedPagesCount: selectedIds.length,
            pageCount: pageBatches.length,
            framesDone: completedFrameCount,
            totalFrames: dirtyFrameCount,
            pagesDone: completedPageIds.length,
          });
          var commitData = await commitStorageFirstUploadSession(storageFirstUploadSession, token, {
            chunkPaths: storageFirstUploadedChunkPaths
          });
          if (commitData && commitData.viewToken) lastViewToken = commitData.viewToken;
          pluginTrace('Storage-first upload committed', {
            runId: activeIndexRunId,
            uploadId: storageFirstUploadSession.uploadId || null,
            indexId: commitData && commitData.indexId ? commitData.indexId : null,
            frameCount: completedFrameCount,
            pageCount: completedPageIds.length
          });
          indexedMeta = await applyLocalIndexedPageState(indexedMeta, completedPageIds, idToName, pageSignaturesById);
        } catch (commitErr) {
          var commitMessage = commitErr && commitErr.message ? String(commitErr.message) : 'Failed to finalize uploaded pages';
          if (activeIndexRunMetrics) activeIndexRunMetrics.failed = true;
          logIndexRunSummary({
            result: 'failed',
            completedPages: completedPageIds.length,
            completedFrames: completedFrameCount,
            errorMessage: commitMessage
          });
          figma.notify('Stopped after upload. ' + commitMessage, { error: true });
          figma.ui.postMessage({ type: 'error', message: commitMessage });
          return;
        }
      }

      var resultUrl = 'https://www.figdex.com/gallery?fileKey=' + encodeURIComponent(fileKey) + '&_t=' + Date.now();
      if (lastViewToken) resultUrl += '&viewToken=' + encodeURIComponent(lastViewToken);
      if (isGuestMode && guestAnonId) resultUrl += '&anonId=' + encodeURIComponent(guestAnonId);
      else if (!isGuestMode && token) resultUrl += '&apiKey=' + encodeURIComponent(token);
      figma.notify(completedFrameCount > 0 ? 'Uploaded — ' + completedFrameCount + ' frames across ' + completedPageIds.length + ' page(s)' : 'Index saved');
      pluginTrace('Index run completed', {
        runId: activeIndexRunId,
        pageCount: completedPageIds.length,
        frameCount: completedFrameCount,
        totalChunks: totalUploadedChunks,
        resultUrl: resultUrl
      });
      logIndexRunSummary({
        result: 'completed',
        completedPages: completedPageIds.length,
        completedFrames: completedFrameCount,
        resultUrl: resultUrl
      });
      await sendPluginTelemetryEvent('index_run_completed', {
        runId: activeIndexRunId,
        selectedPagesCount: selectedIds.length,
        pageCount: completedPageIds.length,
        frameCount: completedFrameCount,
        totalChunks: totalUploadedChunks,
      });
      await setStored(STORAGE_KEYS.HAS_EVER_INDEXED, true);
      if (!isGuestMode && token) {
        setTimeout(function () { loadUserLimitsToUI(token); }, 1500);
      }
      figma.ui.postMessage({ type: 'WEB_INDEX_CREATED', resultUrl });
    } catch (e) {
      console.error('[code.js] start-advanced error:', e);
      pluginError('Unexpected indexing exception', {
        runId: activeIndexRunId,
        stage: lastLoggedIndexStage || 'working',
        message: e && e.message ? String(e.message) : 'Unknown error'
      });
      if (activeIndexRunMetrics) activeIndexRunMetrics.failed = true;
      logIndexRunSummary({
        result: 'failed',
        errorMessage: e && e.message ? String(e.message) : 'Unknown error'
      });
      await sendPluginTelemetryEvent('index_run_failed', {
        runId: activeIndexRunId,
        stage: lastLoggedIndexStage || 'working',
        reason: 'unexpected_exception',
        message: e && e.message ? String(e.message) : 'Unknown error',
      });
      figma.notify('Error: ' + (e.message || 'Unknown error'), { error: true });
      figma.ui.postMessage({ type: 'error', message: e.message || 'Unknown error' });
    } finally {
      activeIndexRunStartedAt = 0;
      activeIndexRunId = null;
      activeIndexSessionId = null;
      lastLoggedIndexStage = '';
      activeIndexRunMetrics = null;
    }
    return;
  }
  if (msg.type === 'UI_OPEN_RESULT_WEB') {
    const url = msg.resultUrl || '';
    if (url) figma.ui.postMessage({ type: 'OPEN_RESULT_URL', url });
    return;
  }
};
