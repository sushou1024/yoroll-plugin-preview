/* ============================================================
 * ui/render.js — DOM 渲染层（播放器 + 覆盖层 UI）
 * 只消费 Story 的事件与状态，绝不在这里写剧情分支逻辑。
 *
 * 覆盖层定位思路移植自 CCG templates/rpg/js/engine/screens.js 的
 * sceneSafeRect() + drawChoiceOverlay()：选项必须落在视频**真实显示矩形**内，
 * 不能落进 object-fit: contain 的黑边上。源实现是 canvas 绘制，这里改为 CSS 定位。
 * ============================================================ */
(function () {
  'use strict';
  var P = window.Platform, S = window.Story, Save = window.Save;
  var R = (window.Render = {});

  var el = {};
  var handle = null;        // 当前 playVideo 句柄
  var subs = null;          // 当前节点字幕数组
  var subIdx = '';
  var timerRaf = null;
  var pendingNode = null;   // 待展示的选项/玩法节点

  function $(id) { return document.getElementById(id); }

  R.init = function () {
    el.stage = $('stage'); el.videoA = $('videoA'); el.videoB = $('videoB');
    el.poster = $('poster'); el.loading = $('loading'); el.fallback = $('mediaFallback');
    el.subtitle = $('subtitle'); el.overlay = $('overlay'); el.hud = $('hud');
    el.skip = $('skipBtn'); el.sound = $('soundBtn');

    P.mountVideos(el.videoA, el.videoB);
    P.onResize(reposition);
    P.onSoundStateChange(function (unlocked) {
      el.sound.hidden = unlocked;
      el.sound.textContent = unlocked ? '🔊 声音已开' : '🔇 开启声音';
    });
    el.sound.addEventListener('click', function () { P.unlockAudio(); });
    el.skip.addEventListener('click', function () { skipClip(); });

    S.on('enter', onEnter);
    S.on('choice', function (node) { pendingNode = node; });
    S.on('mechanic', function (node) { pendingNode = node; });
    S.on('ending', onEnding);
  };

  // ---------------- 节点进入 ----------------
  function onEnter(node, id) {
    clearOverlay();
    pendingNode = null;
    Save.write(S.state);

    subs = node.subtitle || null; subIdx = '';
    el.subtitle.hidden = true;
    el.fallback.hidden = true;
    el.skip.hidden = !(node.skippable !== false && node.media);

    if (node.poster) {
      el.poster.src = P.resolveMedia(node.poster);
      el.poster.classList.add('is-active');
    } else {
      el.poster.classList.remove('is-active');
    }

    if (handle && handle.stop) { try { handle.stop(); } catch (e) {} }

    if (!node.media) { showTextOnly(node); return; }

    el.loading.hidden = false;
    handle = P.playVideo(node.media, {
      holdOnEnd: true,                    // 播完冻结最后一帧，供选项/结局面板叠加
      loop: !!node.loop,
      onWaiting: function (waiting) { el.loading.hidden = !waiting; },
      onTime: function (t) { el.loading.hidden = true; tickSubtitle(t); maybeEarlyOverlay(node, t); },
      onEnd: function () { el.loading.hidden = true; onClipEnd(node); },
      onError: function (reason) { el.loading.hidden = true; showMediaFallback(node, reason); }
    });

    // 预热下一段候选，切段不黑帧
    var nexts = S.nextMedia(node);
    if (nexts.length) P.preloadVideo(nexts[0]);
  }

  function showTextOnly(node) {
    // 纯文字节点（还没接素材时的过渡形态，也是素材缺失时的兜底形态）
    el.fallback.hidden = false;
    el.fallback.textContent = node.text || '';
    waitForContinue(node);
  }

  function showMediaFallback(node, reason) {
    // 片段加载失败 → 文字兜底，绝不白屏卡死
    el.fallback.hidden = false;
    el.fallback.textContent = node.text || (node.subtitle || []).map(function (s) { return s.text; }).join('\n') ||
      '这一段影像没能加载出来（' + reason + '），故事继续。';
    waitForContinue(node);
  }

  /* 无视频可播时，用一个明确的「继续」把节奏交回玩家，不要瞬间闪过。
     本节点还挂着选项/玩法时直接进入它们，不多插一层「继续」。 */
  function waitForContinue(node) {
    clearOverlay();
    if (S.pending()) { onClipEnd(node); return; }
    var box = document.createElement('div');
    box.className = 'choice-box';
    box.dataset.anchor = 'bottom';
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'choice-btn'; b.textContent = '继续 ▶';
    b.addEventListener('click', function () { clearOverlay(); onClipEnd(node); });
    box.appendChild(b);
    el.overlay.appendChild(box);
    placeInSafeRect(box, 'bottom');
  }

  function skipClip() {
    if (handle && handle.stop) { try { handle.stop(); } catch (e) {} }
    var node = S.current();
    if (node) onClipEnd(node);
  }

  function onClipEnd(node) {
    el.skip.hidden = true;
    var p = S.pending();
    if (p === 'choice') { showChoices(node); return; }
    if (p === 'mechanic') { showMechanic(node); return; }
    S.clipEnded();
  }

  /* 限时选择：节点配了 choice_at 就在播放中途弹出选项（视频继续播） */
  function maybeEarlyOverlay(node, t) {
    if (!pendingNode || node.choice_at == null) return;
    if (t >= node.choice_at) { pendingNode = null; showChoices(node, true); }
  }

  // ---------------- 字幕 ----------------
  function tickSubtitle(t) {
    if (!subs || !subs.length) return;
    var i = -1;
    for (var k = 0; k < subs.length; k++) { if (t >= subs[k].t) i = k; else break; }
    var cur = i >= 0 ? subs[i] : null;
    var text = (cur && (cur.until == null || t <= cur.until)) ? (cur.text || '') : '';
    if (text === subIdx) return;      // subIdx 此处存「当前已渲染的字幕文本」，避免每帧写 DOM
    subIdx = text;
    el.subtitle.textContent = text;
    el.subtitle.hidden = !text;
  }

  // ---------------- 覆盖层 ----------------
  function clearOverlay() {
    if (timerRaf) { cancelAnimationFrame(timerRaf); timerRaf = null; }
    el.overlay.innerHTML = '';
  }

  /* 把覆盖层元素放进视频真实显示矩形（避免落进黑边）。 */
  function placeInSafeRect(box, anchor) {
    var rect = P.videoSafeRect(P.activeVideo(), el.stage);
    var w = Math.min(rect.w * 0.88, 520);
    box.style.width = w + 'px';
    box.style.left = (rect.x + (rect.w - w) / 2) + 'px';
    if (anchor === 'center') {
      box.style.top = (rect.y + rect.h / 2 - box.offsetHeight / 2) + 'px';
    } else {
      var bottomPad = Math.max(24, rect.h * 0.06);
      var top = rect.y + rect.h - bottomPad - box.offsetHeight;
      box.style.top = Math.max(rect.y + 12, top) + 'px';
    }
  }
  function reposition() {
    var box = el.overlay.querySelector('.choice-box, .slot-host');
    if (box) placeInSafeRect(box, box.dataset.anchor || 'bottom');
  }

  function showChoices(node, keepPlaying) {
    clearOverlay();
    if (!keepPlaying) el.skip.hidden = true;

    var box = document.createElement('div');
    box.className = 'choice-box';
    box.dataset.anchor = node.choice_anchor || 'bottom';

    if (node.prompt) {
      var p = document.createElement('div');
      p.className = 'choice-prompt';
      p.textContent = node.prompt;
      box.appendChild(p);
    }

    S.options(node).forEach(function (row) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice-btn';
      b.textContent = row.option.label || ('选项 ' + (row.index + 1));
      if (row.option.hint) {
        var h = document.createElement('span');
        h.className = 'choice-hint';
        h.textContent = row.option.hint;
        b.appendChild(h);
      }
      if (!row.enabled) { b.disabled = true; b.title = row.option.locked_hint || '条件未满足'; }
      b.addEventListener('click', function () { clearOverlay(); S.choose(row.index); });
      box.appendChild(b);
    });

    var timerEl = null;
    if (node.timer && node.timer.seconds > 0) {
      timerEl = document.createElement('div');
      timerEl.className = 'choice-timer';
      timerEl.innerHTML = '<i></i>';
      box.appendChild(timerEl);
    }

    el.overlay.appendChild(box);
    placeInSafeRect(box, box.dataset.anchor);

    if (timerEl) runTimer(timerEl.firstChild, node.timer.seconds, function () {
      clearOverlay(); S.timeout();
    });
  }

  function runTimer(bar, seconds, onDone) {
    var t0 = P.now(), ms = seconds * 1000;
    (function step() {
      var k = Math.max(0, 1 - (P.now() - t0) / ms);
      bar.style.transform = 'scaleX(' + k + ')';
      if (k <= 0) { timerRaf = null; onDone(); return; }
      timerRaf = requestAnimationFrame(step);
    })();
  }

  // ---------------- 玩法插槽 ----------------
  function showMechanic(node) {
    clearOverlay();
    var host = document.createElement('div');
    host.className = 'slot-host';
    host.dataset.anchor = 'center';
    el.overlay.appendChild(host);

    var rect = P.videoSafeRect(P.activeVideo(), el.stage);
    host.style.left = rect.x + 'px';
    host.style.top = rect.y + 'px';
    host.style.width = rect.w + 'px';
    host.style.height = rect.h + 'px';

    window.Slots.mount(node.mechanic, host, function (result) {
      clearOverlay();
      S.mechanicResult(result);
    });
  }

  // ---------------- 结局 ----------------
  function onEnding(node) {
    clearOverlay();
    el.skip.hidden = true;
    if (!node) return;
    var info = node.ending || {};
    if (info.id) Save.unlockEnding(info.id);
    Save.clear(false);   // 通关后清进度，保留结局收集

    var panel = document.createElement('div');
    panel.className = 'panel';
    var total = S.validate().endings.length;
    var got = Save.unlockedEndings().length;
    panel.innerHTML =
      '<h2></h2><p></p><p class="muted"></p><div class="row"></div>';
    panel.querySelector('h2').textContent = info.title || '结局';
    panel.querySelector('p').textContent = info.text || '';
    panel.querySelector('.muted').textContent = '已解锁结局 ' + got + ' / ' + total;

    var again = document.createElement('button');
    again.type = 'button'; again.className = 'primary-btn'; again.textContent = '再看一遍';
    again.addEventListener('click', function () { clearOverlay(); S.start(null); });
    panel.querySelector('.row').appendChild(again);

    el.overlay.appendChild(panel);
  }
})();
