/**
 * FigDex plugin — identity storage (plain, strict).
 * getIdentity / setIdentity / clearIdentity / isConnected
 */
(function(global) {
  'use strict';
  var _token = '';
  var _user = null;

  function getIdentity() {
    var exists = !!(_token && typeof _token === 'string' && _token.length > 0);
    var tokenMasked = exists ? (_token.length <= 10 ? _token.substring(0, 10) + '...' : _token.substring(0, 10) + '...') : '';
    return { exists: exists, tokenMasked: tokenMasked, token: _token, user: _user };
  }

  function setIdentity(token, user) {
    _token = typeof token === 'string' ? token : '';
    _user = user !== undefined ? user : null;
  }

  function clearIdentity() {
    _token = '';
    _user = null;
  }

  /** Strict: connected only if we have a non-empty token. */
  function isConnected() {
    return !!(_token && typeof _token === 'string' && _token.trim().length > 0);
  }

  global.__figdexIdentityStore = {
    getIdentity: getIdentity,
    setIdentity: setIdentity,
    clearIdentity: clearIdentity,
    isConnected: isConnected
  };
})(typeof window !== 'undefined' ? window : this);
