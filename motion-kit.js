/*!
 * MotionKit v1.0 — GSAP + mo.js 클래스 기반 모션 모음
 * 필요: gsap (필수), mo.js (ani-burst 사용할 때만)
 *
 * [입장 모션]  ani-fade / fade-up / fade-down / fade-left / fade-right
 *              ani-zoom-in / zoom-out / blur / rotate / flip
 * [텍스트]     ani-split-chars / ani-split-words
 * [묶음]       ani-group (자식이 각자 입장 클래스, 부모 옵션 상속), ani-stagger (자식 순차 등장)
 * [숫자]       ani-count
 * [호버]       ani-hover-lift / hover-scale / hover-rotate
 * [클릭]       ani-click-pulse / click-shake / ani-burst (mo.js)
 *
 * [옵션: data 속성]
 * data-ani-duration  data-ani-delay  data-ani-ease  data-ani-distance
 * data-ani-stagger   data-ani-threshold  data-ani-margin
 * data-ani-trigger="load"  (기본은 스크롤 진입)
 * data-ani-repeat="once|reverse|replay"  (기본 once, reverse/replay는 ScrollTrigger 필요)
 * data-ani-mobile / data-ani-tablet="off|프리셋명"  (구간별 끄기/교체)
 * MotionKit.config.breakpoints / mobileScale  (반응형 경계와 모바일 축소 비율)
 * data-ani-child="fade-up" (ani-stagger / split / group 용 자식 모션)
 * data-ani-target=".item"  (ani-stagger 대상 선택자, 기본은 직계 자식)
 * data-ani-to / from / decimals / prefix / suffix (ani-count)
 * data-ani-burst-count / radius / colors / shape (ani-burst, 실제 속성명은 data-ani-burst-colors)
 */
(function (global) {
  'use strict';

  document.documentElement.classList.add('ani-ready'); // CSS 초기 숨김 활성화 (미로드 시 watch dog가 ani-fail로 복구)

  var doc = document;
  var gsap = global.gsap;

  if (!gsap) {
    doc.documentElement.classList.add('ani-fail'); // CSS가 숨겨둔 요소를 다시 보이게 함
    console.warn('[MotionKit] gsap를 motion-kit.js보다 먼저 불러와 주세요.');
    return;
  }

  var ST = global.ScrollTrigger;
  if (ST) {
    gsap.registerPlugin(ST);
    ST.config({ ignoreMobileResize: true });
  } else console.warn('[MotionKit] ScrollTrigger가 없어 ScrollTrigger가 필요한 기능은 건너뜁니다.');

  var PREFIX = 'ani-';
  var cfg = {
    duration: 0.8,
    ease: 'power3.out',
    distance: 40,
    stagger: 0.08,
    threshold: 0.15,
    breakpoints: { mobile: 767, tablet: 1023 },
    mobileScale: 0.6,
    burstColors: ['#ff5a5f', '#ffb400', '#00a699', '#7b61ff', '#ffffff']
  };

  var reduce = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var mm;
  var activeSegment = null;
  var activeHover = null;
  var warnedMojs = false;
  var warnedRepeat = false;
  var refreshTimer;

  /* ---------- 유틸 ---------- */
  function attr(el, key, def) {
    var v = el.getAttribute('data-ani-' + key);
    return v === null || v === '' ? def : v;
  }
  function num(el, key, def) {
    var v = parseFloat(attr(el, key, NaN));
    return isNaN(v) ? def : v;
  }
  function extend(a, b) {
    for (var k in b) a[k] = b[k];
    return a;
  }
  // clearProps는 기존 인라인 값까지 지우므로, 애니메이션 전 값을 저장해 끝낼 때 되돌린다
  function keepInline(targets) {
    var list = typeof targets.length === 'number' ? targets : [targets];
    var saved = [];
    for (var i = 0; i < list.length; i++) {
      saved.push({ el: list[i], transform: list[i].style.transform, filter: list[i].style.filter });
    }
    return function () {
      for (var j = 0; j < saved.length; j++) {
        saved[j].el.style.transform = saved[j].transform;
        saved[j].el.style.filter = saved[j].filter;
      }
    };
  }

  function scaleOf(state) {
    return state && state.segment === 'mobile' ? cfg.mobileScale : 1;
  }

  // "off"는 끄기, 프리셋명은 교체. 알 수 없는 값은 무시한다.
  function segmentPreset(el, state) {
    var v = state ? attr(el, state.segment, null) : null;
    if (!v) return null;
    if (v === 'off') return 'off';
    return P[v] ? v : null;
  }

  function resolvePreset(el, fallback, state, inherited) {
    var v = segmentPreset(el, state);
    if (v === 'off') return 'off';
    if (v) return v;
    if (inherited === 'off') return 'off';
    if (inherited) return inherited;
    return fallback;
  }

  function targetList(targets) {
    return typeof targets.length === 'number' ? targets : [targets];
  }

  function show(targets, state) {
    var list = targetList(targets);
    state.context.add(function () { gsap.set(list, { opacity: 1, visibility: 'visible' }); });
  }

  // will-change는 애니메이션이 실제로 시작될 때만 붙이고, 끝나면 원래 인라인 값으로 되돌린다.
  function willRelease(targets) {
    var list = targetList(targets);
    var saved = [];
    for (var i = 0; i < list.length; i++) saved.push({ el: list[i], v: list[i].style.willChange });
    return function () {
      for (var j = 0; j < saved.length; j++) saved[j].el.style.willChange = saved[j].v;
    };
  }

  function markWill(targets) {
    gsap.set(targetList(targets), { willChange: 'transform, opacity' });
  }

  /* ---------- 입장 모션 프리셋 (시작 상태만 정의) ---------- */
  var P = {
    'fade': function () { return { opacity: 0 }; },
    'fade-up': function (d) { return { opacity: 0, y: d }; },
    'fade-down': function (d) { return { opacity: 0, y: -d }; },
    'fade-left': function (d) { return { opacity: 0, x: d }; },
    'fade-right': function (d) { return { opacity: 0, x: -d }; },
    'zoom-in': function () { return { opacity: 0, scale: 0.8 }; },
    'zoom-out': function () { return { opacity: 0, scale: 1.2 }; },
    'blur': function () { return { opacity: 0, filter: 'blur(12px)' }; },
    'rotate': function (d) { return { opacity: 0, rotation: -10, y: d / 2 }; },
    'flip': function () { return { opacity: 0, rotationX: -80, transformPerspective: 800 }; }
  };

  // 시작 상태 → 도착 상태(원래 모습) 자동 계산
  function destOf(from) {
    var to = {};
    for (var k in from) {
      if (k === 'opacity' || k === 'scale') to[k] = 1;
      else if (k === 'filter') to[k] = 'blur(0px)';
      else if (k === 'transformPerspective') to[k] = from[k];
      else to[k] = 0;
    }
    return to;
  }

  function tweenIn(targets, preset, el, opts) {
    opts = opts || {};
    var restore = keepInline(targets);
    var release = willRelease(targets);
    if (opts.state) opts.state.cleanups.push(release);
    var d = num(el, 'distance', opts.distance != null ? opts.distance : cfg.distance) * (opts.scale || 1);
    var fn = P[preset] || P['fade-up'];
    var from = fn(d);
    var to = destOf(from);
    var delay = opts.delay != null ? opts.delay : num(el, 'delay', 0);
    to.duration = reduce ? 0 : num(el, 'duration', cfg.duration);
    to.delay = reduce ? 0 : (opts.timeline ? 0 : delay);
    to.ease = attr(el, 'ease', cfg.ease);
    to.onStart = function () { markWill(targets); };
    to.onComplete = function () { restore(); release(); };
    to.onReverseComplete = release;
    to.onInterrupt = release;
    if (opts.multi) to.stagger = num(el, 'stagger', cfg.stagger);
    if (opts.paused && !opts.timeline) to.paused = true;
    var tween = gsap.fromTo(targets, from, to);
    if (opts.timeline) opts.timeline.add(tween, reduce ? 0 : delay);
    return tween;
  }

  /* ---------- 트리거: 로드 / 스크롤 진입 ---------- */
  function repeatMode(el) {
    var m = attr(el, 'repeat', 'once');
    if ((m === 'reverse' || m === 'replay') && !ST) {
      if (!warnedRepeat) {
        console.warn('[MotionKit] ScrollTrigger가 없어 data-ani-repeat는 once로 동작합니다.');
        warnedRepeat = true;
      }
      return 'once';
    }
    return m === 'reverse' || m === 'replay' ? m : 'once';
  }

  function onEnter(el, fn, repeatable, state) {
    var mode = repeatable === false ? 'once' : repeatMode(el);
    function run(build) {
      if (!state.active) return null;
      var out = null;
      state.context.add(function () { out = fn(build); });
      return out;
    }
    if (mode !== 'once' && ST) {
      var anim = run(true);
      if (!anim) return;
      state.context.add(function () {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 95%',
          end: 'bottom top',
          animation: anim,
          toggleActions: mode === 'reverse' ? 'play none none reverse' : 'restart none none restart'
        });
      });
      return;
    }
    // reduced-motion이면 스크롤 위치와 무관하게 모션 없이 바로 보여준다.
    if (reduce || attr(el, 'trigger', 'scroll') === 'load' || !('IntersectionObserver' in global)) {
      requestAnimationFrame(function () { run(false); });
      return;
    }
    // 옵션(threshold/margin)이 같은 요소는 observer 하나를 공유한다.
    var threshold = num(el, 'threshold', cfg.threshold);
    var margin = attr(el, 'margin', '0px 0px -5% 0px');
    var key = String(threshold) + '|' + margin;
    var io = state.ios[key];
    if (!io) {
      io = state.ios[key] = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var cb = state.watchers.get(en.target);
          if (!cb) return;
          state.watchers.delete(en.target);
          io.unobserve(en.target);
          cb();
        });
      }, { threshold: threshold, rootMargin: margin });
    }
    state.watchers.set(el, function () { run(false); });
    io.observe(el);
  }

  /* ---------- 바인딩 ---------- */
  function bindEntrance(el, name, state) {
    var preset = resolvePreset(el, name, state, null);
    if (preset === 'off') { show(el, state); return; }
    onEnter(el, function (build) {
      return tweenIn(el, preset, el, { paused: !!build, scale: scaleOf(state), state: state });
    }, true, state);
  }

  function bindStagger(el, state) {
    var sel = attr(el, 'target', null);
    var kids = Array.prototype.slice.call(sel ? el.querySelectorAll(sel) : el.children);
    var preset = resolvePreset(el, attr(el, 'child', 'fade-up'), state, null);
    if (preset === 'off') { show(kids, state); return; }
    onEnter(el, function (build) {
      return tweenIn(kids, preset, el, { multi: true, paused: !!build, scale: scaleOf(state), state: state });
    }, true, state);
  }

  function presetOf(el) {
    var classes = el.classList;
    for (var i = 0; i < classes.length; i++) {
      var c = classes[i];
      if (c.indexOf(PREFIX) === 0 && P[c.slice(PREFIX.length)]) return c.slice(PREFIX.length);
    }
    return null;
  }

  function inGroup(el) {
    var p = el.parentElement;
    while (p) {
      if (p.classList && p.classList.contains(PREFIX + 'group')) return true;
      p = p.parentElement;
    }
    return false;
  }

  function bindGroup(el, state) {
    var kids = Array.prototype.slice.call(el.children);
    if (!kids.length) return;
    var inherited = segmentPreset(el, state);
    if (inherited === 'off') { show(kids, state); return; }
    var stagger = num(el, 'stagger', cfg.stagger);
    var base = num(el, 'delay', 0);
    onEnter(el, function (build) {
      var tl = build ? gsap.timeline({ paused: true }) : null;
      var added = false;
      for (var i = 0; i < kids.length; i++) {
        var preset = resolvePreset(kids[i], presetOf(kids[i]) || attr(el, 'child', 'fade-up'), state, inherited);
        if (preset === 'off') { show(kids[i], state); continue; }
        tweenIn(kids[i], preset, el, { delay: reduce ? 0 : base + i * stagger, timeline: tl, scale: scaleOf(state), state: state });
        added = true;
      }
      return added ? tl : null;
    }, true, state);
  }

  function splitText(el, mode) {
    if (el.children.length) {
      console.warn('[MotionKit] ani-split-*은 자식 엘리먼트가 있는 요소는 분할하지 않습니다.', el);
      return null;
    }
    var text = el.textContent.trim().replace(/\s+/g, ' ');
    var parts = [];
    el.setAttribute('aria-label', text);
    el.textContent = '';
    text.split(' ').forEach(function (word, i, arr) {
      var w = doc.createElement('span');
      w.style.display = 'inline-block';
      w.setAttribute('aria-hidden', 'true');
      if (mode === 'chars') {
        Array.from(word).forEach(function (ch) {
          var c = doc.createElement('span');
          c.style.display = 'inline-block';
          c.textContent = ch;
          w.appendChild(c);
          parts.push(c);
        });
      } else {
        w.textContent = word;
        parts.push(w);
      }
      el.appendChild(w);
      if (i < arr.length - 1) el.appendChild(doc.createTextNode(' '));
    });
    return parts;
  }

  function bindSplit(el, mode, state) {
    var preset = resolvePreset(el, attr(el, 'child', 'fade-up'), state, null);
    if (preset === 'off') { show(el, state); return; }
    var original = el.textContent;
    var aria = el.getAttribute('aria-label');
    var parts = splitText(el, mode);
    if (!parts) {
      show(el, state); // CSS가 숨겼으므로 분할을 건너뛴 요소는 바로 보여준다
      return;
    }
    state.cleanups.push(function () {
      el.textContent = original;
      if (aria === null) el.removeAttribute('aria-label');
      else el.setAttribute('aria-label', aria);
    });
    var restore = keepInline(parts);
    var release = willRelease(parts);
    state.cleanups.push(release);
    var from = (P[preset] || P['fade-up'])(num(el, 'distance', 20) * scaleOf(state));
    state.context.add(function () { gsap.set(parts, from); });
    show(el, state);
    onEnter(el, function (build) {
      var to = destOf(from);
      to.duration = reduce ? 0 : num(el, 'duration', 0.6);
      to.delay = reduce ? 0 : num(el, 'delay', 0);
      to.ease = attr(el, 'ease', cfg.ease);
      to.stagger = num(el, 'stagger', mode === 'chars' ? 0.03 : 0.08);
      to.onStart = function () { markWill(parts); };
      to.onComplete = function () { restore(); release(); };
      to.onReverseComplete = release;
      to.onInterrupt = release;
      to.paused = !!build;
      return gsap.to(parts, to);
    }, true, state);
  }

  function bindCount(el, state) {
    var to = parseFloat(attr(el, 'to', String(el.textContent).replace(/[^0-9.\-]/g, '')));
    if (isNaN(to)) return;
    var from = num(el, 'from', 0);
    var dec = num(el, 'decimals', 0);
    var pre = attr(el, 'prefix', '');
    var suf = attr(el, 'suffix', '');
    var obj = { v: from };
    function fmt(v) {
      return pre + Number(v).toLocaleString('ko-KR', {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec
      }) + suf;
    }
    if (segmentPreset(el, state) === 'off') {
      el.textContent = fmt(to);
      return;
    }
    el.textContent = fmt(from);
    onEnter(el, function () {
      gsap.to(obj, {
        v: to,
        duration: reduce ? 0 : num(el, 'duration', 1.6),
        delay: reduce ? 0 : num(el, 'delay', 0),
        ease: 'power1.out',
        onUpdate: function () { el.textContent = fmt(obj.v); },
        onComplete: function () { el.textContent = fmt(to); }
      });
    }, false, state);
  }

  /* ---------- 호버 ---------- */
  var HOVER = {
    'lift': { y: -8 },
    'scale': { scale: 1.06 },
    'rotate': { rotation: 4 }
  };

  function bindHover(el, name, state) {
    var to = HOVER[name];
    if (!to || reduce || segmentPreset(el, activeSegment) === 'off') return;
    var back = {};
    for (var k in to) back[k] = k === 'scale' ? 1 : 0;
    function enter() {
      state.context.add(function () { gsap.to(el, extend({ duration: 0.3, ease: 'power2.out', overwrite: 'auto' }, to)); });
    }
    function leave() {
      state.context.add(function () { gsap.to(el, extend({ duration: 0.4, ease: 'power2.out', overwrite: 'auto' }, back)); });
    }
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    state.cleanups.push(function () {
      el.removeEventListener('mouseenter', enter);
      el.removeEventListener('mouseleave', leave);
    });
  }

  /* ---------- 클릭 ---------- */
  function burst(el, e, state) {
    if (!global.mojs) {
      if (!warnedMojs) {
        console.warn('[MotionKit] mo.js가 로드되지 않아 ani-burst를 건너뜁니다.');
        warnedMojs = true;
      }
      return;
    }
    var b = el._aniBurst;
    if (!b) {
      var scale = scaleOf(state);
      var colors = String(attr(el, 'burst-colors', cfg.burstColors.join(',')))
        .split(',').map(function (s) { return s.trim(); });
      var shape = attr(el, 'burst-shape', 'circle');
      var children = {
        shape: shape,
        radius: { 7: 0 },
        duration: 700,
        easing: 'cubic.out'
      };
      if (shape === 'line') {
        children.stroke = colors;
        children.strokeWidth = 2;
      } else {
        children.fill = colors;
      }
      b = el._aniBurst = new global.mojs.Burst({
        left: 0,
        top: 0,
        radius: { 4: num(el, 'burst-radius', 80) * scale },
        count: Math.max(1, Math.round(num(el, 'burst-count', 10) * scale)),
        children: children
      });
    }
    var x = e.pageX || 0;
    var y = e.pageY || 0;
    if (!x || !y) { // 키보드 활성화 등 좌표가 없는 클릭은 버튼 중심으로 대체
      var r = el.getBoundingClientRect();
      x = r.left + r.width / 2 + global.pageXOffset;
      y = r.top + r.height / 2 + global.pageYOffset;
    }
    b.tune({ x: x, y: y }).replay();
  }

  var CLICK = {
    'pulse': function (el) {
      gsap.fromTo(el, { scale: 0.9 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1,0.4)', overwrite: 'auto' });
    },
    'shake': function (el) {
      gsap.fromTo(el, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.2)', overwrite: 'auto' });
    }
  };

  function bindClick(el, name, state) {
    if (reduce || segmentPreset(el, activeSegment) === 'off') return;
    var fn = name === 'burst' ? burst : CLICK[name];
    if (!fn) return;
    var handler = function (e) { fn(el, e, state); };
    el.addEventListener('click', handler);
    state.cleanups.push(function () {
      el.removeEventListener('click', handler);
      if (name === 'burst') el._aniBurst = null;
    });
  }

  /* ---------- 초기화 (구간별 context + cleanup) ---------- */
  function bindElement(el, state, hoverOnly) {
    Array.prototype.forEach.call(Array.prototype.slice.call(el.classList), function (c) {
      if (c.indexOf(PREFIX) !== 0) return;
      var n = c.slice(PREFIX.length);
      var isHover = n.indexOf('hover-') === 0;
      if (hoverOnly !== isHover) return;
      if (n === 'group') bindGroup(el, state);
      else if (P[n]) { if (!inGroup(el)) bindEntrance(el, n, state); } // 그룹 자식은 부모가 한 번에 재생
      else if (n === 'stagger') bindStagger(el, state);
      else if (n === 'split-chars') bindSplit(el, 'chars', state);
      else if (n === 'split-words') bindSplit(el, 'words', state);
      else if (n === 'count') bindCount(el, state);
      else if (n === 'burst') bindClick(el, 'burst', state);
      else if (isHover) bindHover(el, n.slice(6), state);
      else if (n.indexOf('click-') === 0) bindClick(el, n.slice(6), state);
    });
  }

  function bindList(root, state, hoverOnly) {
    if (!root || !root.querySelectorAll || !state || !state.active) return;
    var selector = '[class*="' + PREFIX + '"]';
    var list = Array.prototype.slice.call(root.querySelectorAll(selector));
    if (root.nodeType === 1 && root.matches && root.matches(selector)) list.unshift(root);
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (state.seen.has(el)) continue;
      state.seen.add(el);
      try {
        bindElement(el, state, hoverOnly);
      } catch (e) {
        console.warn('[MotionKit] 요소 초기화를 건너뜁니다.', el, e);
      }
    }
  }

  function init(root) {
    bindList(root || doc, activeSegment, false);
    bindList(root || doc, activeHover, true);
  }

  function newState(segment, context) {
    return {
      segment: segment,
      context: context,
      seen: new WeakSet(),
      watchers: new WeakMap(),
      ios: {},
      cleanups: [],
      active: true
    };
  }

  function cleanupState(state) {
    state.active = false;
    for (var i = 0; i < state.cleanups.length; i++) state.cleanups[i]();
    for (var key in state.ios) state.ios[key].disconnect();
    state.ios = {};
  }

  function setupMedia() {
    if (!gsap.matchMedia) { // 구버전 gsap 폴백: 정리 없이 한 번만 바인딩
      var ctx = { add: function (fn) { fn(); } };
      activeSegment = newState('desktop', ctx);
      activeHover = newState('fine', ctx);
      init();
      return;
    }
    mm = gsap.matchMedia();
    var b = cfg.breakpoints;
    mm.add({
      mobile: '(max-width: ' + b.mobile + 'px)',
      tablet: '(min-width: ' + (b.mobile + 1) + 'px) and (max-width: ' + b.tablet + 'px)',
      desktop: '(min-width: ' + (b.tablet + 1) + 'px)'
    }, function (context) {
      var c = context.conditions;
      var segment = c.mobile ? 'mobile' : c.tablet ? 'tablet' : 'desktop';
      var state = newState(segment, context);
      activeSegment = state;
      bindList(doc, state, false);
      return function () {
        cleanupState(state);
        if (activeSegment === state) activeSegment = null;
      };
    });
    mm.add('(hover: hover) and (pointer: fine)', function (context) {
      var state = newState('fine', context);
      activeHover = state;
      bindList(doc, state, true);
      return function () {
        cleanupState(state);
        if (activeHover === state) activeHover = null;
      };
    });
    init();
  }

  function refreshST() {
    if (ST) ST.refresh();
  }

  function waitImage(img) {
    return new global.Promise(function (resolve) {
      img.addEventListener('load', resolve);
      img.addEventListener('error', resolve);
    });
  }

  function refreshAfterAssets() {
    if (!global.Promise) return;
    var jobs = [];
    if (doc.fonts && doc.fonts.ready) jobs.push(doc.fonts.ready);
    for (var i = 0; i < doc.images.length; i++) {
      if (!doc.images[i].complete) jobs.push(waitImage(doc.images[i]));
    }
    if (!jobs.length) {
      refreshST();
      return;
    }
    global.Promise.all(jobs).then(refreshST, refreshST);
  }

  function debouncedRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshST, 150);
  }

  global.addEventListener('resize', debouncedRefresh);
  global.addEventListener('orientationchange', debouncedRefresh);

  if (doc.readyState === 'complete') {
    refreshST();
    refreshAfterAssets();
  } else {
    global.addEventListener('load', function () {
      refreshST();
      refreshAfterAssets();
    });
  }

  global.MotionKit = {
    version: '1.0.0',
    config: cfg,        // MotionKit.config.duration = 1 처럼 기본값 변경
    presets: P,         // 커스텀 프리셋: MotionKit.presets['my'] = function(d){ return {opacity:0, y:d}; }
    init: init,         // 동적으로 추가한 DOM: MotionKit.init(container)
    refresh: init
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', setupMedia);
  else setupMedia();
})(window);
