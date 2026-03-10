/**
 * FigDex plugin — 4-state flow controller.
 * States: READY_TO_SETUP | READY_TO_INDEX | NEEDS_CONNECT | INDEXING
 * Guards: indexing never starts without identity.
 */
(function(global) {
  'use strict';
  var STATES = {
    READY_TO_SETUP: 'READY_TO_SETUP',
    READY_TO_INDEX: 'READY_TO_INDEX',
    NEEDS_CONNECT: 'NEEDS_CONNECT',
    INDEXING: 'INDEXING'
  };
  var _state = STATES.READY_TO_SETUP;
  var _identityStore = null;
  var _telemetry = null;
  var _onOpenWeb = null;
  var _onStartIndexing = null;

  function getState() { return _state; }
  function setState(s) {
    if (STATES[s]) _state = s;
  }

  function canIndex() {
    return _identityStore && _identityStore.getIdentity().exists;
  }

  function init(opts) {
    _identityStore = opts.identityStore || global.__figdexIdentityStore;
    _telemetry = opts.telemetry || global.__figdexTelemetry;
    _onOpenWeb = opts.onOpenWeb || null;
    _onStartIndexing = opts.onStartIndexing || null;
  }

  function onSaveAndContinue(fileKey, fileName) {
    if (_telemetry) _telemetry.log('file_link_saved', { fileKey: fileKey ? fileKey.substring(0, 10) + '...' : '' });
    setState(STATES.READY_TO_INDEX);
  }

  function onIndexClick() {
    if (_telemetry) _telemetry.log('index_click', { identity: canIndex() ? 'exists' : 'none', state: getState() });
    if (!canIndex()) {
      setState(STATES.NEEDS_CONNECT);
      if (_telemetry) _telemetry.log('needs_connect');
      if (_onOpenWeb) _onOpenWeb();
      return;
    }
    if (_onStartIndexing) _onStartIndexing();
  }

  function onOpenWeb() {
    if (_telemetry) _telemetry.log('open_web_connect');
    if (_onOpenWeb) _onOpenWeb();
  }

  function registerHandlers(domRefs) {
    if (!domRefs) return;
    if (domRefs.saveAndContinueBtn) {
      domRefs.saveAndContinueBtn.addEventListener('click', function() {
        var input = domRefs.fileKeyInput || document.getElementById('fileKeyInlineInput');
        var url = input && input.value ? input.value.trim() : '';
        var fileKey = (typeof global.extractFileKeyFromUrl === 'function') ? global.extractFileKeyFromUrl(url) : null;
        var fileName = (typeof global.extractFileNameFromUrl === 'function') ? global.extractFileNameFromUrl(url) : null;
        onSaveAndContinue(fileKey, fileName);
      });
    }
    if (domRefs.advanceBtn) {
      domRefs.advanceBtn.addEventListener('click', function() {
        if (domRefs.advanceBtn.disabled) return;
        onIndexClick();
      });
    }
    if (domRefs.openWebBanner) {
      domRefs.openWebBanner.addEventListener('click', function() { onOpenWeb(); });
    }
  }

  global.__figdexFlowController = {
    STATES: STATES,
    getState: getState,
    setState: setState,
    canIndex: canIndex,
    init: init,
    registerHandlers: registerHandlers,
    onSaveAndContinue: onSaveAndContinue,
    onIndexClick: onIndexClick,
    onOpenWeb: onOpenWeb
  };
})(typeof window !== 'undefined' ? window : this);
