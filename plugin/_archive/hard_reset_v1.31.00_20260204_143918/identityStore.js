/**
 * FigDex plugin — identity storage (beta: plain only, no encryption).
 * getIdentity(), setIdentity(), clearIdentity()
 * Returns { exists, tokenMasked, token }
 */
(function(global) {
  'use strict';
  var _token = '';
  var _user = null;

  function getIdentity() {
    var exists = !!(_token && _token.length > 0);
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

  /** Sync from legacy globals (e.g. webSystemToken) so new flow sees current identity. */
  function syncFromLegacy(legacyToken, legacyUser) {
    if (legacyToken && typeof legacyToken === 'string' && legacyToken.length > 0) {
      _token = legacyToken;
      _user = legacyUser !== undefined ? legacyUser : null;
    }
  }

  global.__figdexIdentityStore = {
    getIdentity: getIdentity,
    setIdentity: setIdentity,
    clearIdentity: clearIdentity,
    syncFromLegacy: syncFromLegacy
  };
})(typeof window !== 'undefined' ? window : this);
