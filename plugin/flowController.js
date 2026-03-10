/**
 * FigDex plugin — flow controller (hard reset).
 * FSM: BOOT | READY_TO_SETUP | NEEDS_CONNECT | READY_TO_INDEX | INDEXING | DONE | ERROR
 * dispatch(event) — single entry for transitions; pendingAction for resume after connect.
 */
(function(global) {
  'use strict';
  var STATES = {
    BOOT: 'BOOT',
    READY_TO_SETUP: 'READY_TO_SETUP',
    NEEDS_CONNECT: 'NEEDS_CONNECT',
    READY_TO_INDEX: 'READY_TO_INDEX',
    INDEXING: 'INDEXING',
    DONE: 'DONE',
    ERROR: 'ERROR'
  };
  var _state = STATES.BOOT;
  var _pendingAction = null;
  var _identityStore = null;
  var _telemetry = null;
  var _onOpenWeb = null;
  var _onRunIndexing = null;
  var _trace = true;

  function getState() { return _state; }
  function getPendingAction() { return _pendingAction; }
  function clearPendingAction() { _pendingAction = null; }

  function _traceTransition(prev, event, next) {
    if (_trace && _telemetry) {
      _telemetry.log('state_change', { prevState: prev, event: event, nextState: next });
      try { console.log('[FigDex] controller:', prev, '->', event, '->', next); } catch (e) {}
    }
  }

  function dispatch(event, payload) {
    try { console.log('[FigDex] controller.dispatch', event, payload || {}); } catch (e) {}
    var prev = _state;
    payload = payload || {};

    if (event === 'auth_expired') {
      _pendingAction = { type: 'START_INDEXING', selectedPages: payload.selectedPages || [] };
      _state = STATES.NEEDS_CONNECT;
      if (_telemetry) _telemetry.log('auth_expired');
      _traceTransition(prev, event, _state);
      return _state;
    }

    switch (_state) {
      case STATES.BOOT:
        if (event === 'identity_loaded') {
          _state = _identityStore && _identityStore.isConnected() ? STATES.READY_TO_INDEX : STATES.READY_TO_SETUP;
          _traceTransition(prev, event, _state);
        } else if (event === 'UI_CREATE_INDEX_CLICKED') {
          var sel = payload.selectedPages || [];
          var connected = _identityStore && _identityStore.isConnected();
          try { console.log('[FigDex] gating: isConnected', connected); } catch (e) {}
          if (!connected) {
            _pendingAction = { type: 'START_INDEXING', selectedPages: sel };
            _state = STATES.NEEDS_CONNECT;
            if (_telemetry) _telemetry.log('needs_connect');
            _traceTransition(prev, 'EVT_CREATE_INDEX_REQUESTED', _state);
          } else {
            _state = STATES.INDEXING;
            if (_telemetry) _telemetry.log('indexing_start');
            _traceTransition(prev, 'EVT_CREATE_INDEX_REQUESTED', _state);
            if (_onRunIndexing) _onRunIndexing(sel);
          }
        }
        break;
      case STATES.READY_TO_SETUP:
        if (event === 'identity_loaded' && _identityStore && _identityStore.isConnected()) {
          _state = STATES.READY_TO_INDEX;
          _traceTransition(prev, event, _state);
        } else if (event === 'file_link_saved') {
          _state = STATES.READY_TO_INDEX;
          _traceTransition(prev, event, _state);
        } else if (event === 'UI_CREATE_INDEX_CLICKED') {
          var selectedPages0 = payload.selectedPages || [];
          var isConnected0 = _identityStore && _identityStore.isConnected();
          try { console.log('[FigDex] gating: isConnected', isConnected0); } catch (e) {}
          if (!isConnected0) {
            _pendingAction = { type: 'START_INDEXING', selectedPages: selectedPages0 };
            _state = STATES.NEEDS_CONNECT;
            if (_telemetry) _telemetry.log('needs_connect');
            _traceTransition(prev, 'EVT_CREATE_INDEX_REQUESTED', _state);
          } else {
            _state = STATES.INDEXING;
            if (_telemetry) _telemetry.log('indexing_start');
            _traceTransition(prev, 'EVT_CREATE_INDEX_REQUESTED', _state);
            if (_onRunIndexing) _onRunIndexing(selectedPages0);
          }
        }
        break;
      case STATES.READY_TO_INDEX:
        if (event === 'file_link_saved') {
          _state = STATES.READY_TO_INDEX;
          _traceTransition(prev, event, _state);
        } else if (event === 'UI_CREATE_INDEX_CLICKED') {
          var selectedPages = payload.selectedPages || [];
          var isConnected = _identityStore && _identityStore.isConnected();
          try { console.log('[FigDex] gating: isConnected', isConnected); } catch (e) {}
          if (!isConnected) {
            _pendingAction = { type: 'START_INDEXING', selectedPages: selectedPages };
            _state = STATES.NEEDS_CONNECT;
            if (_telemetry) _telemetry.log('needs_connect');
            _traceTransition(prev, 'EVT_CREATE_INDEX_REQUESTED', _state);
          } else {
            _state = STATES.INDEXING;
            if (_telemetry) _telemetry.log('indexing_start');
            _traceTransition(prev, 'EVT_CREATE_INDEX_REQUESTED', _state);
            if (_onRunIndexing) _onRunIndexing(selectedPages);
          }
        } else if (event === 'identity_loaded' && _identityStore && _identityStore.isConnected()) {
          _state = STATES.READY_TO_INDEX;
          _traceTransition(prev, event, _state);
        } else if (event === 'intent_open_web') {
          if (_telemetry) _telemetry.log('intent', { action: 'open_web' });
          if (_onOpenWeb) _onOpenWeb();
        }
        break;
      case STATES.NEEDS_CONNECT:
        if (event === 'connect_timeout') {
          if (_telemetry) _telemetry.log('connect_timeout');
        } else if (event === 'reset') {
          _pendingAction = null;
          _state = _identityStore && _identityStore.isConnected() ? STATES.READY_TO_INDEX : STATES.READY_TO_SETUP;
          _traceTransition(prev, event, _state);
        } else if (event === 'EVT_CONNECT_SUCCESS') {
          if (_telemetry) _telemetry.log('connect_success');
          var pa = _pendingAction;
          _pendingAction = null;
          _state = STATES.READY_TO_INDEX;
          _traceTransition(prev, event, _state);
          if (pa && pa.type === 'START_INDEXING' && pa.selectedPages && _onRunIndexing) {
            _state = STATES.INDEXING;
            if (_telemetry) _telemetry.log('indexing_start');
            _traceTransition(STATES.READY_TO_INDEX, 'resume_pending', _state);
            _onRunIndexing(pa.selectedPages);
          }
        }
        break;
      case STATES.INDEXING:
        if (event === 'web_index_created') {
          if (_telemetry) _telemetry.log('web_index_created');
          _state = STATES.DONE;
          _traceTransition(prev, event, _state);
        } else if (event === 'indexing_done') {
          if (_telemetry) _telemetry.log('indexing_done');
          _state = STATES.DONE;
          _traceTransition(prev, event, _state);
        } else if (event === 'indexing_failed') {
          if (_telemetry) _telemetry.log('error', { type: 'indexing_failed', message: payload.message });
          _state = STATES.ERROR;
          _traceTransition(prev, event, _state);
        }
        break;
      case STATES.DONE:
      case STATES.ERROR:
        if (event === 'reset') {
          _state = _identityStore && _identityStore.isConnected() ? STATES.READY_TO_INDEX : STATES.READY_TO_SETUP;
          _traceTransition(prev, event, _state);
        } else if (event === 'intent_open_web') {
          if (_telemetry) _telemetry.log('intent', { action: 'open_web' });
          if (_onOpenWeb) _onOpenWeb();
        }
        break;
      default:
        break;
    }
    return _state;
  }

  function init(opts) {
    _identityStore = opts.identityStore || global.__figdexIdentityStore;
    _telemetry = opts.telemetry || global.__figdexTelemetry;
    _onOpenWeb = opts.onOpenWeb || null;
    _onRunIndexing = opts.onRunIndexing || null;
    _trace = opts.trace !== false;
  }

  global.__figdexFlowController = {
    STATES: STATES,
    getState: getState,
    getPendingAction: getPendingAction,
    clearPendingAction: clearPendingAction,
    dispatch: dispatch,
    init: init
  };
})(typeof window !== 'undefined' ? window : this);
