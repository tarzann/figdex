/**
 * FigDex plugin — index engine wrapper.
 * runIndexing({ fileLink, selectedPages, identity, onProgress })
 * Wraps existing indexing/upload logic; move code gradually later.
 */
(function(global) {
  'use strict';
  var _telemetry = null;

  function init(opts) {
    _telemetry = opts.telemetry || global.__figdexTelemetry;
  }

  function runIndexing(opts) {
    opts = opts || {};
    var fileLink = opts.fileLink;
    var selectedPages = opts.selectedPages || [];
    var identity = opts.identity;
    var onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : function() {};
    if (!identity || !identity.exists) {
      if (_telemetry) _telemetry.log('indexing_failed', { reason: 'no_identity' });
      return;
    }
    if (_telemetry) _telemetry.log('indexing_started');
    if (typeof opts.onLegacyStart === 'function') {
      opts.onLegacyStart();
    } else {
      if (_telemetry) _telemetry.log('indexing_failed', { reason: 'no_legacy_start' });
    }
  }

  global.__figdexIndexEngine = {
    init: init,
    runIndexing: runIndexing
  };
})(typeof window !== 'undefined' ? window : this);
