/* ============================================================
 * slots/registry.js — 自定义玩法插槽（CCG 源模板没有这一层，全新增）
 *
 * 插槽协议（生命周期固定四步）：
 *   register(kind, factory)
 *   factory(config, host, done) → { unmount() }
 *   done(result)  result ∈ 'success' | 'fail' | 'timeout'
 * 宿主容器 host 已由 render.js 定位到视频真实显示矩形内；插槽只管往里塞 DOM。
 * 剧情去向由节点的 mechanic.on[result] 决定，插槽自己不碰 Story。
 *
 * config 字段名与 references/qte-reference.md 对齐（click_count / area_position /
 * area_size / press_time / duration），便于和平台侧 QTE 参数互相搬运。
 * 归一化坐标：area_position "0.5,0.5" 为容器中心，area_size "0.4,0.3" 为容器占比。
 * ============================================================ */
(function () {
  'use strict';
  var Slots = (window.Slots = {});
  var registry = {};

  Slots.register = function (kind, factory) { registry[kind] = factory; };
  Slots.has = function (kind) { return !!registry[kind]; };

  Slots.mount = function (mechanic, host, done) {
    var kind = mechanic && mechanic.kind;
    var factory = registry[kind];
    var finished = false;
    function finish(result) {
      if (finished) return; finished = true;
      if (inst && inst.unmount) { try { inst.unmount(); } catch (e) {} }
      host.innerHTML = '';
      done(result);
    }
    if (!factory) {
      // 未注册的玩法：不许白屏卡死，给一个可点过的降级按钮并在控制台点名
      console.warn('[slots] 未注册的玩法类型：', kind, '→ 已降级为「继续」按钮');
      host.innerHTML = '';
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'primary-btn'; btn.textContent = '继续';
      btn.addEventListener('click', function () { finish('success'); });
      host.appendChild(btn);
      return;
    }
    var inst = factory(mechanic.config || {}, host, finish);
  };

  // ---------------- 工具 ----------------
  function pair(str, dx, dy) {
    var p = String(str || '').split(',');
    var a = parseFloat(p[0]), b = parseFloat(p[1]);
    return { x: isNaN(a) ? dx : a, y: isNaN(b) ? dy : b };
  }
  function hint(host, text) {
    if (!text) return;
    var h = document.createElement('div');
    h.className = 'slot-hint';
    h.textContent = text;
    host.appendChild(h);
    return h;
  }
  function placeTarget(btn, cfg) {
    var pos = pair(cfg.area_position, 0.5, 0.5);
    btn.style.position = 'absolute';
    btn.style.left = (pos.x * 100) + '%';
    btn.style.top = (pos.y * 100) + '%';
    btn.style.transform = 'translate(-50%, -50%)';
    var size = cfg.area_size ? pair(cfg.area_size, 0.35, 0.35) : null;
    if (size) { btn.style.width = (size.x * 100) + '%'; btn.style.height = (size.y * 100) + '%'; }
  }
  function countdown(seconds, onTimeout) {
    if (!seconds || seconds <= 0) return function () {};
    var t = setTimeout(onTimeout, seconds * 1000);
    return function () { clearTimeout(t); };
  }

  // ---------------- 示例插槽 1：点击 ----------------
  Slots.register('click', function (cfg, host, done) {
    var need = parseInt(cfg.click_count, 10) || 1;
    var got = 0;
    var label = cfg.instruction_text_1 || '快速点击';
    hint(host, label);
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'slot-target';
    btn.textContent = need > 1 ? (need + ' 次') : '点击';
    placeTarget(btn, cfg);
    btn.addEventListener('click', function () {
      got++;
      btn.textContent = need > 1 ? (need - got) + ' 次' : '点击';
      if (got >= need) { stop(); done('success'); }
    });
    host.appendChild(btn);
    var stop = countdown(cfg.duration == null ? 4 : cfg.duration, function () { done('timeout'); });
    return { unmount: stop };
  });

  // ---------------- 示例插槽 2：长按 ----------------
  Slots.register('longpress', function (cfg, host, done) {
    var need = (parseFloat(cfg.press_time) || 2) * 1000;
    var t0 = 0, raf = null;
    hint(host, cfg.instruction_text_1 || '按住不放');
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'slot-target';
    btn.textContent = '按住';
    placeTarget(btn, cfg);
    function tick() {
      var k = Math.min(1, (Date.now() - t0) / need);
      btn.textContent = Math.round(k * 100) + '%';
      if (k >= 1) { release(); stop(); done('success'); return; }
      raf = requestAnimationFrame(tick);
    }
    function press(e) { e.preventDefault(); t0 = Date.now(); tick(); }
    function release() { if (raf) { cancelAnimationFrame(raf); raf = null; } btn.textContent = '按住'; }
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
    host.appendChild(btn);
    var stop = countdown(cfg.duration == null ? 6 : cfg.duration, function () { release(); done('timeout'); });
    return { unmount: function () { release(); stop(); } };
  });
})();
