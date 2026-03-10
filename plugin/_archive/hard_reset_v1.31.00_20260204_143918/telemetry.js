/**
 * FigDex plugin — minimal telemetry logging.
 * Events: init, file_link_saved, index_click, needs_connect, open_web_connect,
 *         identity_ready, indexing_started, indexing_web_ready, indexing_completed, indexing_failed
 */
(function(global) {
  'use strict';
  var PREFIX = '[FigDex]';
  function log(event, data) {
    if (data !== undefined && data !== null) {
      console.log(PREFIX, event, data);
    } else {
      console.log(PREFIX, event);
    }
  }
  global.__figdexTelemetry = { log: log };
})(typeof window !== 'undefined' ? window : this);
