/**
 * FigDex plugin — index engine (hard reset).
 * runIndexing(selectedPages, identity, callbacks)
 * No UI decisions; no identity reads internally; behavior preserved via callbacks.
 */
(function(global) {
  'use strict';
  var _telemetry = null;

  function init(opts) {
    _telemetry = opts && opts.telemetry ? opts.telemetry : global.__figdexTelemetry;
  }

  /**
   * @param {string[]} selectedPages - page IDs to index
   * @param {{ token: string }} identity - must have token
   * @param {{ onStart: function(), onProgress: function(p), onDone: function(), onError: function(msg) }} callbacks
   */
  function runIndexing(selectedPages, identity, callbacks) {
    callbacks = callbacks || {};
    if (!identity || !identity.token) {
      if (callbacks.onError) callbacks.onError('no_identity');
      return;
    }
    if (_telemetry) _telemetry.log('indexing_start');
    if (typeof callbacks.onStart === 'function') callbacks.onStart();
    // Delegate actual work to plugin (code.js) via postMessage; UI only sends intent.
    // Controller will have wired onRunIndexing to send message to code.js and handle reply.
    if (typeof callbacks.onLegacyStart === 'function') {
      callbacks.onLegacyStart(selectedPages, identity);
    } else {
      if (callbacks.onError) callbacks.onError('no_legacy_start');
    }
  }

  global.__figdexIndexEngine = {
    init: init,
    runIndexing: runIndexing
  };
})(typeof window !== 'undefined' ? window : this);
