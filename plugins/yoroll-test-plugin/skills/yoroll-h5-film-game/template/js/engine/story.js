/* ============================================================
 * engine/story.js — 分支剧情运行器（数据驱动，纯状态机，不碰 DOM）
 * 移植自 CCG H5GameAI templates/rpg/js/engine/story.js（见 PROVENANCE.md）：
 * 保留 applyEffects / process / choose / goto / end 这套「效果类瞬时生效，演示类停下等输入」
 * 的运行结构，以及 set/add/flag 的变量副作用语义。
 *
 * 与源文件的差异（有意为之）：
 *  - 数据模型从「steps 有序数组 + label 跳转」改为「node 图 + 节点 ID 跳转」：影视小游戏
 *    的分支发生在片段之间，节点 ID 稳定可寻址，才能做可达性校验与存档。
 *  - 去掉 RPG 引擎耦合（E.inv.addItem / E.world.loadMap / player.skills / E.toast / 打字机吐字）。
 *  - 渲染完全解耦：本文件只发事件，DOM 由 js/ui/render.js 消费。
 *
 * 节点数据契约见 content/story.js 顶部注释。
 * ============================================================ */
(function () {
  'use strict';
  var Story = (window.Story = {});

  var data = null;
  var listeners = {};
  var pending = null;   // 当前节点上待用户输入的东西：'choice' | 'mechanic' | null

  Story.state = { node: null, vars: {}, seen: {}, finished: false };

  // ---------------- 事件 ----------------
  // 'enter'(node,id) / 'choice'(node) / 'mechanic'(node) / 'ending'(node) / 'vars'(vars)
  Story.on = function (evt, cb) { (listeners[evt] = listeners[evt] || []).push(cb); };
  function emit(evt, a, b) {
    (listeners[evt] || []).forEach(function (f) { try { f(a, b); } catch (e) { console.error(e); } });
  }

  // ---------------- 初始化 ----------------
  Story.init = function (storyData) {
    data = storyData || {};
    data.meta = data.meta || {};
    data.nodes = data.nodes || {};
    Story.state = { node: null, vars: shallow(data.vars || {}), seen: {}, finished: false };
  };
  Story.data = function () { return data; };
  Story.meta = function () { return (data && data.meta) || {}; };
  Story.node = function (id) { return (data && data.nodes && data.nodes[id]) || null; };
  Story.current = function () { return Story.node(Story.state.node); };

  function shallow(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }

  /* 从头开始，或从存档恢复。存档节点已不存在时退回起点（改剧情后的旧档不该白屏）。 */
  Story.start = function (saved) {
    var s = Story.state;
    if (saved && Story.node(saved.node)) {
      s.vars = Object.assign(shallow(data.vars || {}), saved.vars || {});
      s.seen = saved.seen || {};
      s.finished = false;
      enter(saved.node, false);   // 恢复时不重复施加副作用
    } else {
      s.vars = shallow(data.vars || {});
      s.seen = {};
      s.finished = false;
      enter(data.meta.start, true);
    }
  };

  // ---------------- 变量与条件 ----------------
  function applyEffects(src) {
    if (!src) return;
    var s = Story.state, changed = false, k;
    if (src.set) { for (k in src.set) { s.vars[k] = src.set[k]; changed = true; } }
    if (src.add) { for (k in src.add) { s.vars[k] = (Number(s.vars[k]) || 0) + Number(src.add[k]); changed = true; } }
    if (src.flag) { s.vars[src.flag] = true; changed = true; }
    if (changed) emit('vars', s.vars);
  }

  /* requires: { has_key: true, trust: { gte: 2 } } —— 全部满足才为真。 */
  function meets(requires) {
    if (!requires) return true;
    var vars = Story.state.vars;
    for (var k in requires) {
      var want = requires[k], got = vars[k];
      if (want && typeof want === 'object') {
        if (want.gte !== undefined && !(Number(got) >= want.gte)) return false;
        if (want.gt !== undefined && !(Number(got) > want.gt)) return false;
        if (want.lte !== undefined && !(Number(got) <= want.lte)) return false;
        if (want.lt !== undefined && !(Number(got) < want.lt)) return false;
        if (want.ne !== undefined && got === want.ne) return false;
        if (want.eq !== undefined && got !== want.eq) return false;
      } else if (got !== want) {
        return false;
      }
    }
    return true;
  }
  Story.meets = meets;

  /* 当前可见/可选的选项（不满足 requires 的：hideWhenLocked 则隐藏，否则置灰） */
  Story.options = function (node) {
    node = node || Story.current();
    if (!node || !node.choices) return [];
    return node.choices.map(function (o, i) {
      return { index: i, option: o, enabled: meets(o.requires), locked: !meets(o.requires) };
    }).filter(function (row) { return !(row.locked && row.option.hideWhenLocked); });
  };

  // ---------------- 节点流转 ----------------
  function enter(id, withEffects) {
    var node = Story.node(id);
    if (!node) { console.warn('[story] 节点不存在：', id); Story.state.finished = true; emit('ending', null); return; }
    Story.state.node = id;
    Story.state.seen[id] = true;
    if (withEffects !== false) applyEffects(node);

    // pending 必须在 'enter' 之前定好：渲染层在 onEnter 里就要知道本节点后面还挂着什么
    pending = null;
    if (node.type !== 'ending') {
      if (node.mechanic) pending = 'mechanic';
      else if (node.choices && node.choices.length) pending = 'choice';
    }
    emit('enter', node, id);

    if (node.type === 'ending') {
      Story.state.finished = true;
      emit('ending', node, id);
      return;
    }
    if (pending) { emit(pending, node, id); return; }
  }

  Story.go = function (id) { enter(id, true); };

  /* 片段自然播完：有选项就等选项，否则走 on_end。 */
  Story.clipEnded = function () {
    var node = Story.current();
    if (!node || Story.state.finished) return;
    if (pending) return;                       // 选项/玩法还没解决 → 停在本节点
    if (node.on_end) { enter(node.on_end, true); return; }
    console.warn('[story] 死端节点（无 on_end 且非 ending）：', Story.state.node);
  };

  Story.choose = function (index) {
    var node = Story.current();
    if (!node || pending !== 'choice') return;
    var opt = (node.choices || [])[index];
    if (!opt || !meets(opt.requires)) return;
    pending = null;
    applyEffects(opt);                          // 副作用只在跳转真正发生时施加一次
    enter(opt.to || node.on_end, true);
  };

  /* 限时选择超时 → 走 timer.default_to（没配就用第一个可选项）。 */
  Story.timeout = function () {
    var node = Story.current();
    if (!node || pending !== 'choice') return;
    if (node.timer && node.timer.default_to) { pending = null; enter(node.timer.default_to, true); return; }
    var first = Story.options(node).filter(function (r) { return r.enabled; })[0];
    if (first) Story.choose(first.index);
  };

  /* 玩法插槽回调：result ∈ 'success' | 'fail' | 'timeout'。 */
  Story.mechanicResult = function (result) {
    var node = Story.current();
    if (!node || pending !== 'mechanic') return;
    var map = (node.mechanic && node.mechanic.on) || {};
    var to = map[result] || map.fail || map.success || node.on_end;
    pending = null;
    if (node.mechanic && node.mechanic.effects && node.mechanic.effects[result]) {
      applyEffects(node.mechanic.effects[result]);
    }
    if (to) enter(to, true);
    else console.warn('[story] 玩法节点没有配置结果去向：', Story.state.node, result);
  };

  Story.pending = function () { return pending; };

  /* 预加载候选：当前节点所有可能的下一段媒体（供渲染层预热）。 */
  Story.nextMedia = function (node) {
    node = node || Story.current();
    if (!node) return [];
    var ids = [];
    if (node.on_end) ids.push(node.on_end);
    (node.choices || []).forEach(function (o) { if (o.to) ids.push(o.to); });
    if (node.timer && node.timer.default_to) ids.push(node.timer.default_to);
    var m = (node.mechanic && node.mechanic.on) || {};
    for (var k in m) ids.push(m[k]);
    var out = [], seen = {};
    ids.forEach(function (id) {
      var n = Story.node(id);
      if (n && n.media && !seen[n.media]) { seen[n.media] = 1; out.push(n.media); }
    });
    return out;
  };

  // ---------------- 图静态校验（交付验收直接用） ----------------
  /* 返回 { ok, missingTargets, deadEnds, unreachable, unreachableEndings, remoteMedia, noMedia, endings } */
  Story.validate = function () {
    var nodes = (data && data.nodes) || {};
    var rep = { ok: true, missingTargets: [], deadEnds: [], unreachable: [], unreachableEndings: [], remoteMedia: [], noMedia: [], endings: [] };
    var edges = {};

    Object.keys(nodes).forEach(function (id) {
      var n = nodes[id], outs = [];
      if (n.on_end) outs.push(n.on_end);
      (n.choices || []).forEach(function (o) { if (o.to) outs.push(o.to); });
      if (n.timer && n.timer.default_to) outs.push(n.timer.default_to);
      var m = (n.mechanic && n.mechanic.on) || {};
      Object.keys(m).forEach(function (k) { if (m[k]) outs.push(m[k]); });
      edges[id] = outs;

      outs.forEach(function (t) { if (!nodes[t]) rep.missingTargets.push({ from: id, to: t }); });
      if (n.type === 'ending') rep.endings.push(id);
      else if (!outs.length) rep.deadEnds.push(id);
      if (n.media && /^https?:/i.test(n.media)) rep.remoteMedia.push({ node: id, url: n.media });
      if (n.type !== 'ending' && !n.media && !n.text) rep.noMedia.push(id);
    });

    // 从起点做可达性
    var start = (data.meta && data.meta.start) || null;
    var reached = {}, stack = start ? [start] : [];
    while (stack.length) {
      var cur = stack.pop();
      if (!cur || reached[cur] || !nodes[cur]) continue;
      reached[cur] = true;
      (edges[cur] || []).forEach(function (t) { if (!reached[t]) stack.push(t); });
    }
    Object.keys(nodes).forEach(function (id) { if (!reached[id]) rep.unreachable.push(id); });
    rep.unreachableEndings = rep.endings.filter(function (id) { return !reached[id]; });

    rep.ok = !rep.missingTargets.length && !rep.deadEnds.length && !rep.unreachable.length &&
             !rep.unreachableEndings.length && !rep.remoteMedia.length && !!start && !!nodes[start];
    if (!start || !nodes[start]) rep.missingTargets.push({ from: '(meta.start)', to: start });
    return rep;
  };
})();
