/* ============================================================
 * engine/save.js — 进度存读档（经 Platform.store，业务不碰 localStorage）
 * 移植自 CCG H5GameAI templates/rpg/js/engine/save.js，存档字段从 RPG 的
 * { player, curMapId, flags } 改为影视小游戏的 { node, vars, seen }。
 * 已解锁结局单独存一份（重玩清档不清它，用于结局回看/收集度）。
 * 初始化幂等：坏档/旧版本档一律当作无档，不抛异常。
 * ============================================================ */
(function () {
  'use strict';
  var P = window.Platform;
  var Save = (window.Save = {});
  var key = 'film-game';
  var version = 1;
  function unlockKey() { return key + ':endings'; }

  Save.init = function (meta) {
    key = (meta && meta.saveKey) || 'film-game';
    version = (meta && meta.version) || 1;
  };

  Save.write = function (state) {
    try {
      P.store.set(key, JSON.stringify({
        v: version,
        node: state.node,
        vars: state.vars || {},
        seen: Object.keys(state.seen || {})
      }));
    } catch (e) {}
  };

  Save.read = function () {
    try {
      var raw = P.store.get(key);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || s.v !== version || !s.node) return null;   // 版本不符 → 当作无档
      var seen = {};
      (s.seen || []).forEach(function (k) { seen[k] = true; });
      return { node: s.node, vars: s.vars || {}, seen: seen };
    } catch (e) { return null; }
  };

  Save.has = function () { return !!Save.read(); };

  /* 重玩清档：只清进度，保留已解锁结局。full=true 时连结局收集一起清。 */
  Save.clear = function (full) {
    P.store.del(key);
    if (full) P.store.del(unlockKey());
  };

  Save.unlockEnding = function (id) {
    if (!id) return;
    var all = Save.unlockedEndings();
    if (all.indexOf(id) >= 0) return;
    all.push(id);
    try { P.store.set(unlockKey(), JSON.stringify(all)); } catch (e) {}
  };

  Save.unlockedEndings = function () {
    try {
      var raw = P.store.get(unlockKey());
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  };
})();
