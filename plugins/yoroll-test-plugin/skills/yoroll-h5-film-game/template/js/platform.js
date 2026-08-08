/* ============================================================
 * platform.js — 平台抽象层（收口层）· 浏览器实现
 * 移植自 CCG H5GameAI templates/rpg/js/platform.js（见 PROVENANCE.md）。
 * 引擎与渲染层只依赖 Platform.*，绝不直接碰 <video> 兼容细节 / localStorage。
 *
 * 与源文件的差异（有意为之）：
 *  - 去掉 canvas / pointer / wheel / keyboard / moveVec：那是 RPG canvas 输入层，
 *    影视小游戏用 DOM 事件，不需要。
 *  - playVideo 从「每次新建 <video> 并 append」改为「双 <video> 元素轮换 + 预加载」，
 *    避免切段黑帧；holdOnEnd（播完冻结最后一帧供覆盖层叠加）行为保留。
 *  - 自动播放策略：先试有声 → 失败自动降级静音重播（源自 intro.js）→ 同时露出
 *    「开启声音」按钮，把有声播放绑定到用户手势。源文件只有点击门、没有静音降级。
 *  - 按钮文案与字体不再硬编码在这里，由调用方传入。
 * ============================================================ */
(function () {
  'use strict';

  var VIDEO_STALL_TIMEOUT = 8000; // readyState 一直上不去的兜底时间（ms）

  // ---- 屏幕 ----
  function screen() {
    return { w: window.innerWidth, h: window.innerHeight, dpr: Math.min(window.devicePixelRatio || 1, 2) };
  }
  var resizeCbs = [];
  function onResize(cb) { resizeCbs.push(cb); }
  function fireResize() { resizeCbs.forEach(function (f) { try { f(); } catch (e) {} }); }
  window.addEventListener('resize', fireResize);
  window.addEventListener('orientationchange', function () { setTimeout(fireResize, 60); });

  // ---- 时间 ----
  var now = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };

  // ---- 存档 KV（业务不直接碰 localStorage） ----
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  // ---- 图片 ----
  function loadImage(src) {
    return new Promise(function (res) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { res(null); };
      im.src = src;
    });
  }

  // ---- 媒体路径解析：裸文件名 → assets/ 下；相对路径原样保留 ----
  function resolveMedia(f) {
    if (!f) return f;
    if (/^(https?:|data:|blob:|\.{0,2}\/|assets\/)/.test(f)) return f;
    return 'assets/' + f;
  }
  function isRemote(f) { return !!f && /^https?:/i.test(f); }

  // ============================================================
  // 视频：双元素轮换播放器
  // ============================================================
  var els = [];        // [videoA, videoB]
  var activeIdx = 0;
  var wantsSound = false;   // 用户是否已用手势解锁有声播放
  var soundCbs = [];

  function mountVideos(a, b) {
    els = [a, b];
    els.forEach(function (v) {
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');
      v.preload = 'auto';
    });
  }

  function idleEl() { return els[1 - activeIdx]; }
  function activeEl() { return els[activeIdx]; }

  /* 预加载下一段：把 src 挂到空闲元素上，浏览器自行缓冲。 */
  function preloadVideo(src) {
    if (!src || els.length < 2) return;
    var el = idleEl(), url = resolveMedia(src);
    if (el.dataset.src === url) return;
    el.dataset.src = url;
    el.src = url;
    try { el.load(); } catch (e) {}
  }

  /* 用户手势里调用：解锁有声播放。 */
  function unlockAudio() {
    wantsSound = true;
    var v = activeEl();
    if (v && v.dataset.src) { v.muted = false; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    soundCbs.forEach(function (f) { try { f(true); } catch (e) {} });
  }
  function onSoundStateChange(cb) { soundCbs.push(cb); }
  function isMuted() { var v = activeEl(); return v ? !!v.muted : !wantsSound; }

  /* playVideo(src, opts) → { stop(), element }
   * opts: onEnd / onError / onTime(cur,dur) / onWaiting(bool) / holdOnEnd / loop
   * holdOnEnd：播完冻结最后一帧（用于在最后一帧上叠选择 UI），不清空元素。 */
  function playVideo(src, opts) {
    opts = opts || {};
    var url = resolveMedia(src);
    var done = false, stopped = false, stallTimer = null;
    var next = idleEl(), prev = activeEl();

    function fire(name, a, b) {
      var f = opts[name];
      if (typeof f === 'function') { try { f(a, b); } catch (e) { console.error(e); } }
    }
    function detach() {
      next.onended = next.onerror = next.ontimeupdate = null;
      next.onwaiting = next.onplaying = next.onloadedmetadata = null;
      if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
    }
    function finish() {
      if (done) return; done = true;
      detach();
      if (!opts.holdOnEnd) { try { next.pause(); } catch (e) {} }
      fire('onEnd');
    }
    function fail(reason) {
      if (done) return; done = true;
      detach();
      fire('onError', reason);
    }

    if (next.dataset.src !== url) {
      next.dataset.src = url;
      next.src = url;
      try { next.load(); } catch (e) {}
    }
    next.loop = !!opts.loop;
    next.currentTime = 0;
    next.muted = !wantsSound;
    next.volume = opts.volume == null ? 0.9 : opts.volume;

    next.onended = function () { if (!next.loop) finish(); };
    next.onerror = function () { fail('error'); };
    next.onwaiting = function () { fire('onWaiting', true); };
    next.onplaying = function () { fire('onWaiting', false); };
    next.ontimeupdate = function () { fire('onTime', next.currentTime, next.duration || 0); };

    // 卡死兜底：readyState 迟迟上不去就当加载失败，交给上层走文字兜底而不是白屏等待
    stallTimer = setTimeout(function () {
      if (!done && next.readyState < 1) fail('timeout');
    }, VIDEO_STALL_TIMEOUT);

    // 切换可见元素
    activeIdx = 1 - activeIdx;
    next.classList.add('is-active');
    if (prev && prev !== next) {
      prev.classList.remove('is-active');
      try { prev.pause(); } catch (e) {}
    }

    var p = next.play();
    if (p && p.catch) {
      p.catch(function () {
        if (done || stopped) return;
        // 移动端拒绝有声自动播放 → 降级静音重播，并通知上层露出「开启声音」按钮
        next.muted = true;
        wantsSound = false;
        soundCbs.forEach(function (f) { try { f(false); } catch (e) {} });
        var retry = next.play();
        if (retry && retry.catch) retry.catch(function () { fail('autoplay-blocked'); });
      });
    }

    return {
      element: next,
      stop: function () {
        stopped = true;
        detach();
        done = true;
        try { next.pause(); } catch (e) {}
      },
      /* 冻结帧清理：下一段开播前调用，避免上一段最后一帧残留 */
      release: function () {
        try { next.pause(); next.removeAttribute('src'); next.load(); } catch (e) {}
        next.dataset.src = '';
        next.classList.remove('is-active');
      }
    };
  }

  /* 视频在容器内的真实显示矩形（object-fit: contain 会留黑边）。
   * 移植自 templates/rpg/js/engine/screens.js 的 sceneSafeRect()，输出改为 CSS 像素矩形，
   * 供选项按钮定位使用——选项绝不能落进黑边里。 */
  function videoSafeRect(video, container) {
    var box = container.getBoundingClientRect();
    var vw = video && video.videoWidth, vh = video && video.videoHeight;
    if (!vw || !vh) return { x: 0, y: 0, w: box.width, h: box.height };
    var scale = Math.min(box.width / vw, box.height / vh);
    var w = vw * scale, h = vh * scale;
    return { x: (box.width - w) / 2, y: (box.height - h) / 2, w: w, h: h };
  }

  window.Platform = {
    screen: screen, onResize: onResize, now: now, store: store, loadImage: loadImage,
    resolveMedia: resolveMedia, isRemote: isRemote,
    mountVideos: mountVideos, playVideo: playVideo, preloadVideo: preloadVideo,
    unlockAudio: unlockAudio, onSoundStateChange: onSoundStateChange, isMuted: isMuted,
    videoSafeRect: videoSafeRect,
    activeVideo: function () { return activeEl(); }
  };
})();
