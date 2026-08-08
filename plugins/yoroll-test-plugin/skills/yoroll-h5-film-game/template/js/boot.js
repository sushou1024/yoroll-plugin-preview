/* ============================================================
 * boot.js — 启动流程
 * 1) 校验剧情图（结果打到控制台，验收阶段直接读）
 * 2) 开始门：这是移动端有声播放的唯一合法解锁点，必须由用户手势触发
 * 3) 有存档则给「继续上次进度」
 * ============================================================ */
(function () {
  'use strict';
  var P = window.Platform, S = window.Story, Save = window.Save, R = window.Render;

  function $(id) { return document.getElementById(id); }

  document.addEventListener('DOMContentLoaded', function () {
    var story = window.STORY;
    if (!story) { console.error('[boot] 缺少 content/story.js 里的 window.STORY'); return; }

    S.init(story);
    Save.init(story.meta);
    R.init();

    // 图静态校验：孤儿节点 / 死端 / 指向不存在的 ID / 不可达结局 / 残留远端 URL
    var report = S.validate();
    window.__storyReport = report;
    if (report.ok) {
      console.info('[story] 剧情图校验通过，结局数：' + report.endings.length);
    } else {
      console.warn('[story] 剧情图校验未通过：', report);
    }

    var meta = story.meta || {};
    $('gateTitle').textContent = meta.title || '影视小游戏';
    document.title = meta.title || document.title;

    var saved = Save.read();
    var resumeBtn = $('resumeBtn');
    resumeBtn.hidden = !saved;

    function begin(fromSave) {
      $('gate').hidden = true;
      P.unlockAudio();          // 用户手势内解锁有声播放
      S.start(fromSave || null);
    }
    $('startBtn').addEventListener('click', function () { Save.clear(false); begin(null); });
    resumeBtn.addEventListener('click', function () { begin(saved); });
  });
})();
