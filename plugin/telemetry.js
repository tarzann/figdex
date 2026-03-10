/**
 * FigDex plugin — minimal telemetry (hard reset).
 * Events: init, state_change, intent, needs_connect, connect_success, indexing_start, indexing_done, error
 */
(function(global) {
  'use strict';
  var PREFIX = '[FigDex]';
  function log(event, data) {
    if (data !== undefined && data !== null) {
      try { console.log(PREFIX, event, data); } catch (e) {}
    } else {
      try { console.log(PREFIX, event); } catch (e) {}
    }
  }
  global.__figdexTelemetry = { log: log };
})(typeof window !== 'undefined' ? window : this);
