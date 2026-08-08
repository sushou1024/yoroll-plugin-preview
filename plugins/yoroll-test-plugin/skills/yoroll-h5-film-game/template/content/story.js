/* ============================================================
 * content/story.js — 剧情图数据（唯一需要为每部作品重写的文件）
 *
 * 为什么是 .js 而不是 .json：产物必须能双击 index.html 直接跑，file:// 下 fetch('story.json')
 * 会被 CORS 拦掉。这里用一个全局赋值，零构建、零请求。需要 JSON 时再从这份数据导出。
 *
 * ─────────────── 数据契约 ───────────────
 * meta:  { title, start, saveKey, version, orientation:'portrait'|'landscape' }
 * vars:  初始变量表，如 { trust: 0, has_key: false }
 * nodes: { [nodeId]: Node }
 *
 * Node:
 *   type       'clip' | 'ending'                      必填
 *   media      'video/n01.mp4'                        相对路径；裸文件名自动补 assets/
 *   poster     'image/n01.jpg'                        首帧图，避免加载期黑屏
 *   text       '...'                                  无 media 或 media 加载失败时的文字兜底
 *   subtitle   [{ t: 0, text: '...', until: 4 }]      自绘字幕，按 currentTime 触发
 *   loop       true                                   循环播放（等待选择的氛围段可用）
 *   skippable  false                                  禁用跳过（默认可跳）
 *   set/add/flag                                      进入本节点时施加一次的变量副作用
 *   on_end     'node_02'                              播完自动跳转
 *   prompt     '你怎么做？'                            选项标题
 *   choices    [{ label, to, hint, requires, set, add, hideWhenLocked, locked_hint }]
 *   choice_at  8.5                                    播放到第 N 秒就弹出选项（默认播完再弹）
 *   choice_anchor 'bottom' | 'center'
 *   timer      { seconds: 5, default_to: 'node_04' }  限时选择，超时走默认分支
 *   mechanic   { kind: 'click', config: {...},        自定义玩法插槽，见 js/slots/registry.js
 *                on: { success: 'n5', fail: 'n6', timeout: 'n6' },
 *                effects: { success: { add: { trust: 1 } } } }
 *   ending     { id: 'E1', title, text }              type='ending' 时必填
 *
 * ─────────────── 硬规则 ───────────────
 * 1. 节点 ID 稳定、不复用；跳转只能指向已存在的 ID。
 * 2. requires（判定）与 set/add（副作用）分开写；副作用只在跳转真正发生时施加一次。
 * 3. 每个 clip 节点必须有出口（on_end / choices / mechanic.on），否则是死端。
 * 4. 每个 ending 必须至少有一条从 meta.start 出发的可达路径。
 * 5. media 一律相对路径，绝不写远端 URL——临时地址会过期，且发布产物必须自包含。
 *    以上四条由 Story.validate() 静态检查，验收阶段必须跑通（见 SKILL.md 的验收章节）。
 * ============================================================ */

window.STORY = {
  meta: {
    title: '骨架样例：雨夜来电',
    start: 'n01',
    saveKey: 'film-game-demo',
    version: 1,
    orientation: 'portrait'
  },

  vars: { trust: 0, has_key: false },

  nodes: {
    // ── 开场（换成你的片段：把 text 换成 media + subtitle）
    n01: {
      type: 'clip',
      // media: 'video/n01_call.mp4',
      // poster: 'image/n01_call.jpg',
      // subtitle: [{ t: 0.4, text: '喂？' }, { t: 3.0, text: '是我。别挂。' }],
      text: '【第一段】雨夜的便利店，电话响了第三次。\n\n（把这条 text 换成 media 指向的真实片段，字幕写进 subtitle。）',
      on_end: 'n02'
    },

    // ── 分支点：播完在最后一帧上弹选项，5 秒不选走默认分支
    n02: {
      type: 'clip',
      // media: 'video/n02_choice.mp4',
      text: '【第二段】对方报出了一个十年前的地址。',
      prompt: '你怎么回应？',
      timer: { seconds: 8, default_to: 'n04_hangup' },
      choices: [
        { label: '追问下去', hint: '风险未知', to: 'n03_ask', add: { trust: 1 } },
        { label: '挂断电话', to: 'n04_hangup', add: { trust: -1 } }
      ]
    },

    // ── 玩法插槽：QTE 结果决定去向（品类与参数见 references/qte-reference.md）
    n03_ask: {
      type: 'clip',
      // media: 'video/n03_alley.mp4',
      text: '【第三段】他让你三分钟内赶到巷口。',
      mechanic: {
        kind: 'click',
        config: { click_count: '5', duration: 5, instruction_text_1: '快速拨号' },
        on: { success: 'n05_meet', fail: 'n04_hangup', timeout: 'n04_hangup' },
        effects: { success: { set: { has_key: true } } }
      }
    },

    // ── 条件分支：变量决定选项是否可选
    n05_meet: {
      type: 'clip',
      // media: 'video/n05_meet.mp4',
      text: '【第四段】巷口没有人，只有一把钥匙躺在积水里。',
      prompt: '最后一步。',
      choices: [
        { label: '用钥匙开门', to: 'ending_truth', requires: { has_key: true }, locked_hint: '你手上没有钥匙' },
        { label: '转身离开', to: 'ending_quiet' }
      ]
    },

    n04_hangup: {
      type: 'clip',
      // media: 'video/n04_hangup.mp4',
      text: '【另一条线】你挂断了。雨还在下。',
      on_end: 'ending_quiet'
    },

    // ── 结局（至少两个，且都要可达）
    ending_truth: {
      type: 'ending',
      // media: 'video/e1_truth.mp4',
      text: '门后是十年前那个夜晚的全部答案。',
      ending: { id: 'E1', title: '结局一 · 真相', text: '你终于知道那晚发生了什么。' }
    },
    ending_quiet: {
      type: 'ending',
      // media: 'video/e2_quiet.mp4',
      text: '有些电话，不接也是一种选择。',
      ending: { id: 'E2', title: '结局二 · 沉默', text: '故事在你这里停住了。' }
    }
  }
};
