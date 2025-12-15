/**
 * motion-engine.js
 * Stokvel PRO — Motion Engine (Web Animations API)
 *
 * Usage:
 * import MotionEngine from './js/motion-engine.js'
 * const me = new MotionEngine();
 * me.animate(element, { from:{opacity:0}, to:{opacity:1}, duration:400, easing:'easeOut' })
 *
 * Features:
 * - animate() wrapper around Element.animate() with typed props
 * - sequence(), stagger(), parallel()
 * - preset animations (fade, slide, pop, float, attention)
 * - timeline manager with labels, play/pause/seek/reverse
 * - helpers for prefers-reduced-motion, spring-like easing approximation
 * - shared element transition helper
 *
 * Note: This is a pure JS implementation. When using in production,
 * consider bundling/minifying and handling browser differences for Web Animations.
 */

const DEFAULTS = {
  duration: 420,
  easing: 'easeOut',
  fill: 'both',
  delay: 0,
  iterations: 1,
  direction: 'normal',
  composite: 'replace',
  // threshold for auto-cancel of conflicting properties
  conflictThreshold: 150,
  // default stagger gap
  stagger: 40
};

// Easing presets (includes CSS/ease keyword + custom cubic-bezier strings)
const EASINGS = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  fastOutSlowIn: 'cubic-bezier(0.4, 0, 0.2, 1)', // alias
  punch: 'cubic-bezier(.2,.9,.4,1.2)',
  // spring-ish: using steps-like approximation (useful for subtle bounce)
  springSoft: 'cubic-bezier(.2,1.2,.3,1)',
};

// Respect user's reduced-motion preference
const prefersReducedMotion = (() => {
  try {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {
    return false;
  }
})();

/* ---------------------------
 * Utility helpers
 * --------------------------- */

function now() { return performance.now(); }

function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }

function isElement(el) {
  return el instanceof Element || el instanceof HTMLElement || (el && el.nodeType === 1);
}

function parseLength(value) {
  // crude parser: supports px and number -> px
  if (typeof value === 'number') return `${value}px`;
  if (typeof value === 'string') return value;
  return value;
}

function applyDefaultOptions(opts = {}) {
  return Object.assign({}, DEFAULTS, opts);
}

/* spring approximation helper: returns keyframes easing function via cubic-bezier approximations */
function springEasing(bounciness = 0.36) {
  // create variant by bounciness
  if (bounciness < 0.3) return EASINGS.springSoft;
  return 'cubic-bezier(.34,1.56,.64,1)'; // stronger spring
}

/* build keyframes from `from` and `to` objects */
function buildKeyframes(from = {}, to = {}) {
  const kf = [];
  // ensure both are plain objects
  const frameA = Object.assign({}, from);
  const frameB = Object.assign({}, to);
  kf.push(frameA);
  kf.push(frameB);
  return kf;
}

/* convert a prop map (like {x: 10}) to CSS transform string appended to transform property */
function normalizeTransforms(frame) {
  // if frame includes numeric x/y/rotate/scale then translate to transform
  const transformParts = [];
  const out = Object.assign({}, frame);

  if ('x' in out || 'y' in out) {
    const x = out.x || 0;
    const y = out.y || 0;
    transformParts.push(`translate(${parseLength(x)}, ${parseLength(y)})`);
    delete out.x; delete out.y;
  }

  if ('rotate' in out) {
    transformParts.push(`rotate(${out.rotate}deg)`);
    delete out.rotate;
  }

  if ('scale' in out) {
    transformParts.push(`scale(${out.scale})`);
    delete out.scale;
  }

  if (transformParts.length) {
    // merge existing transforms if present
    if (out.transform) {
      out.transform = `${out.transform} ${transformParts.join(' ')}`;
    } else {
      out.transform = transformParts.join(' ');
    }
  }
  return out;
}

/* merge frames and normalize transforms for keyframes */
function normalizeKeyframes(kf) {
  return kf.map(frame => normalizeTransforms(frame));
}

/* Helper: convert property names like opacity/x/y/scale to valid keyframe CSS */
function prepareKeyframes(from, to) {
  // input expects from/to map of properties (x,y,opacity,scale,...)
  const raw = buildKeyframes(from, to);
  return normalizeKeyframes(raw);
}

/* ---------------------------
 * Animation wrapper
 * --------------------------- */

class Motion {
  constructor(player, meta = {}) {
    this.player = player; // Animation instance
    this.meta = meta;
    this._onFinish = [];
    this._onCancel = [];
    this.player.onfinish = (ev) => {
      this._onFinish.forEach(f => f(ev));
    };
    this.player.oncancel = (ev) => {
      this._onCancel.forEach(f => f(ev));
    };
  }

  then(fn) {
    this._onFinish.push(fn);
    return this;
  }

  catch(fn) {
    this._onCancel.push(fn);
    return this;
  }

  pause() { this.player.pause(); return this; }
  play() { this.player.play(); return this; }
  reverse() { this.player.reverse(); return this; }
  cancel() { this.player.cancel(); return this; }
  finish() { this.player.finish(); return this; }

  setCurrentTime(t) { this.player.currentTime = t; return this; }
  getCurrentTime() { return this.player.currentTime; }

  // convenience: await finish
  async wait() {
    return new Promise((resolve, reject) => {
      this._onFinish.push(resolve);
      this._onCancel.push(() => reject(new Error('animation cancelled')));
    });
  }
}

/* create and return Motion object */
function createMotion(element, keyframes, options = {}) {
  if (!isElement(element)) {
    throw new Error('Motion.animate: element must be a DOM element');
  }
  const playOpts = applyDefaultOptions(options);
  // If user prefers reduced motion, collapse to simple opacity toggle
  if (prefersReducedMotion) {
    // create a tiny discrete animation or just set final styles instantly
    try {
      Object.assign(element.style, keyframes[keyframes.length - 1]);
    } catch (e) {}
    // Return a dummy Motion with resolved promise-like interface
    const dummy = {
      player: {
        play() {},
        pause() {},
        cancel() {},
        finish() {},
        reverse() {},
        currentTime: 0
      },
      then() { return dummy; },
      catch() { return dummy; },
      pause() { return dummy; },
      play() { return dummy; },
      reverse() { return dummy; },
      cancel() { return dummy; },
      finish() { return dummy; },
      setCurrentTime() { return dummy; },
      getCurrentTime() { return 0; },
      wait: async () => {}
    };
    return dummy;
  }

  const player = element.animate(keyframes, {
    duration: playOpts.duration,
    easing: (EASINGS[playOpts.easing] || playOpts.easing || EASINGS.easeOut),
    delay: playOpts.delay || 0,
    fill: playOpts.fill,
    iterations: playOpts.iterations,
    direction: playOpts.direction,
    composite: playOpts.composite
  });

  // when animation created, optionally set playbackRate
  if (typeof playOpts.playbackRate === 'number') player.playbackRate = playOpts.playbackRate;

  return new Motion(player, { element, options: playOpts, keyframes });
}

/* ---------------------------
 * API: single animate() function
 * options:
 *  - from: object
 *  - to: object
 *  - duration, delay, easing etc.
 *  - immediate: if true apply end state and skip animation
 * returns Motion
 * --------------------------- */
function animate(el, opts = {}) {
  if (!el) throw new Error('animate: element required');
  const { from = {}, to = {}, keyframes, immediate, ...rest } = opts;
  const frames = keyframes ? keyframes : prepareKeyframes(from, to);
  // if immediate (e.g., prefer reduced motion override), set final styles
  if (immediate || prefersReducedMotion) {
    try {
      Object.assign(el.style, frames[frames.length - 1]);
    } catch (e) {}
    // return dummy resolved Motion
    const dummy = createMotion(el, frames, Object.assign({ duration: 0 }, rest));
    return dummy;
  }
  return createMotion(el, frames, rest);
}

/* ---------------------------
 * Higher-level presets
 * --------------------------- */

function presetFade(el, opts = {}) {
  return animate(el, {
    from: { opacity: 0, transform: 'translateY(6px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    duration: opts.duration || 320,
    easing: opts.easing || 'easeOut',
    delay: opts.delay || 0
  });
}

function presetSlideIn(el, opts = {}) {
  const dir = opts.direction || 'up'; // up/down/left/right
  const from = {};
  if (dir === 'up') from.transform = 'translateY(14px)';
  else if (dir === 'down') from.transform = 'translateY(-14px)';
  else if (dir === 'left') from.transform = 'translateX(14px)';
  else if (dir === 'right') from.transform = 'translateX(-14px)';
  from.opacity = 0;
  return animate(el, {
    from,
    to: { transform: 'translate(0,0)', opacity: 1 },
    duration: opts.duration || 420,
    easing: opts.easing || 'easeOut',
    delay: opts.delay || 0
  });
}

function presetPop(el, opts = {}) {
  return animate(el, {
    from: { opacity: 0, transform: 'scale(0.92)' },
    to: { opacity: 1, transform: 'scale(1)' },
    duration: opts.duration || 360,
    easing: opts.easing || 'springSoft',
    delay: opts.delay || 0
  });
}

function presetFloat(el, opts = {}) {
  return animate(el, {
    from: { transform: 'translateY(0px)' },
    to: { transform: 'translateY(-6px)' },
    duration: opts.duration || 1600,
    easing: opts.easing || 'easeInOut',
    delay: opts.delay || 0,
    iterations: opts.iterations || Infinity,
    direction: 'alternate'
  });
}

function presetAttention(el, opts = {}) {
  // subtle shake or pulse
  return animate(el, {
    keyframes: [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(6px)' },
      { transform: 'translateX(0)' }
    ],
    duration: opts.duration || 420,
    easing: opts.easing || 'cubic-bezier(.2,.8,.2,1)',
    iterations: opts.iterations || 1
  });
}

/* ---------------------------
 * Sequence, Stagger, Parallel helpers
 * --------------------------- */

/**
 * sequence(list, opts)
 * list: array of { el, from, to, opts } or a function returning a Motion
 * returns an object with play/pause/seek and a promise-like wait()
 */
function sequence(tasks = [], global = {}) {
  // tasks is array of functions that when called return Motion
  let index = 0;
  let current = null;
  let cancelled = false;
  const startTime = now();

  async function run() {
    for (index = 0; index < tasks.length; index++) {
      if (cancelled) break;
      const task = tasks[index];
      // allow tasks to be either a function or config object
      let motion;
      if (typeof task === 'function') {
        motion = task();
      } else {
        // expected task: { el, from, to, opts }
        motion = animate(task.el, Object.assign({}, task.opts || {}, { from: task.from, to: task.to }));
      }
      current = motion;
      try {
        await motion.wait();
      } catch (e) {
        // cancelled or failed
        break;
      }
    }
  }

  const promise = run();

  return {
    promise,
    cancel() { cancelled = true; if (current) current.cancel(); },
    then(fn) { promise.then(fn); return this; },
    catch(fn) { promise.catch(fn); return this; }
  };
}

/**
 * stagger(elements, fnOrPreset, opts)
 * elements: NodeList or array
 * fnOrPreset: either a function (el, index) => Motion or a preset name string
 * opts: { gap, direction, ...presetOpts }
 */
function stagger(elements, fnOrPreset, opts = {}) {
  const gap = opts.gap || DEFAULTS.stagger;
  const arr = Array.from(elements);
  const tasks = arr.map((el, i) => {
    const delay = (opts.direction === 'reverse') ? (gap * (arr.length - 1 - i)) : (gap * i);
    if (typeof fnOrPreset === 'function') {
      return () => fnOrPreset(el, i, Object.assign({}, opts, { delay }));
    } else {
      // preset name
      const name = fnOrPreset;
      return () => {
        if (name === 'fade') return presetFade(el, Object.assign({}, opts, { delay }));
        if (name === 'pop') return presetPop(el, Object.assign({}, opts, { delay }));
        if (name === 'slide') return presetSlideIn(el, Object.assign({}, opts, { delay }));
        return animate(el, Object.assign({ delay }, opts));
      };
    }
  });

  return sequence(tasks);
}

/* parallel: run many animations at once and return a controller */
function parallel(runners = []) {
  const motions = runners.map(r => (typeof r === 'function' ? r() : r));
  return {
    play() { motions.forEach(m => m.play()); return this; },
    pause() { motions.forEach(m => m.pause()); return this; },
    cancel() { motions.forEach(m => m.cancel()); return this; },
    wait: async () => Promise.all(motions.map(m => m.wait()))
  };
}

/* ---------------------------
 * Timeline Manager
 * Very small: holds labeled steps and runs them with play/pause/seek
 * --------------------------- */
class Timeline {
  constructor() {
    this.entries = []; // {label, start, duration, fn}
    this._running = false;
    this._current = null;
    this._controllers = [];
  }

  add(label, fnOrCfg, start = 0, duration = 400) {
    this.entries.push({ label, fnOrCfg, start, duration });
    return this;
  }

  play() {
    if (this._running) return;
    this._running = true;
    this._startFrom(0);
  }

  async _startFrom(offset = 0) {
    const entries = this.entries.slice().sort((a, b) => a.start - b.start);
    const runners = [];
    for (const ent of entries) {
      const waitTime = Math.max(0, ent.start - offset);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      if (!this._running) break;
      let runner;
      if (typeof ent.fnOrCfg === 'function') {
        runner = ent.fnOrCfg();
      } else {
        // expects { el, from, to, opts }
        runner = animate(ent.fnOrCfg.el, Object.assign({}, ent.fnOrCfg.opts, { from: ent.fnOrCfg.from, to: ent.fnOrCfg.to }));
      }
      this._controllers.push(runner);
      runners.push(runner);
    }
    // Wait until all finish
    try {
      await Promise.all(runners.map(r => r.wait()));
      this._running = false;
    } catch (e) { /* cancelled */ }
  }

  pause() {
    this._running = false;
    this._controllers.forEach(c => c.pause());
  }

  cancel() {
    this._running = false;
    this._controllers.forEach(c => c.cancel());
    this._controllers = [];
  }
}

/* ---------------------------
 * Shared element transition helper (basic)
 * - clones element, positions it absolute, animates transform/size/opacity to target's rect
 * --------------------------- */
async function sharedElementTransition(fromEl, toEl, opts = {}) {
  if (!fromEl || !toEl) throw new Error('sharedElementTransition requires both elements');
  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();

  const clone = fromEl.cloneNode(true);
  const body = document.body;
  const style = clone.style;
  style.position = 'fixed';
  style.left = `${fromRect.left}px`;
  style.top = `${fromRect.top}px`;
  style.width = `${fromRect.width}px`;
  style.height = `${fromRect.height}px`;
  style.margin = '0';
  style.zIndex = 99999;
  style.transformOrigin = 'top left';
  style.pointerEvents = 'none';
  body.appendChild(clone);

  const dx = toRect.left - fromRect.left;
  const dy = toRect.top - fromRect.top;
  const sx = toRect.width / fromRect.width;
  const sy = toRect.height / fromRect.height;

  const motion = animate(clone, {
    keyframes: [
      { transform: 'translate(0px,0px) scale(1)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 1 }
    ],
    duration: opts.duration || 520,
    easing: opts.easing || 'easeOut'
  });

  try {
    await motion.wait();
  } catch (e) {
    /* ignore */
  }
  clone.remove();
  return motion;
}

/* ---------------------------
 * MotionEngine full export class
 * --------------------------- */
class MotionEngine {
  constructor() {
    this.easing = EASINGS;
    this.defaults = DEFAULTS;
    this.timeline = new Timeline();
  }

  // Low level
  animate(el, options = {}) { return animate(el, options); }
  motion(el, keyframes, opts = {}) { return createMotion(el, keyframes, opts); }

  // Presets
  fade(el, opts = {}) { return presetFade(el, opts); }
  slide(el, opts = {}) { return presetSlideIn(el, opts); }
  pop(el, opts = {}) { return presetPop(el, opts); }
  float(el, opts = {}) { return presetFloat(el, opts); }
  attention(el, opts = {}) { return presetAttention(el, opts); }

  // Composition
  sequence(list, opts = {}) { return sequence(list, opts); }
  stagger(els, presetOrFn, opts = {}) { return stagger(els, presetOrFn, opts); }
  parallel(list) { return parallel(list); }

  // Timeline
  timelineAdd(...args) { return this.timeline.add(...args); }
  timelinePlay() { return this.timeline.play(); }
  timelinePause() { return this.timeline.pause(); }
  timelineCancel() { return this.timeline.cancel(); }

  // Utilities
  shared(from, to, opts = {}) { return sharedElementTransition(from, to, opts); }
  prefersReducedMotion() { return prefersReducedMotion; }
  registerEasing(name, easing) { this.easing[name] = easing; }
  setDefault(name, value) { this.defaults[name] = value; }

  // convenience: attach simple visibility-based reveal-on-scroll
  revealOnScroll(selectorOrEls, opts = {}) {
    const threshold = opts.threshold || 0.12;
    const rootMargin = opts.rootMargin || '0px';
    const els = (typeof selectorOrEls === 'string') ? document.querySelectorAll(selectorOrEls) : selectorOrEls;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // run preset fade/pop
          try {
            this.fade(entry.target, Object.assign({ duration: opts.duration || 420 }, opts));
          } catch (e) {}
          if (opts.once !== false) observer.unobserve(entry.target);
        }
      });
    }, { threshold, rootMargin });
    Array.from(els).forEach(el => observer.observe(el));
    return observer;
  }
}

/* ---------------------------
 * Export the engine as default
 * --------------------------- */
export default MotionEngine;

/* ---------------------------
 * Optional attach for older script usage (window)
 * if not using modules, developer can do: window.MotionEngine = MotionEngine
 * --------------------------- */
if (typeof window !== 'undefined') {
  try {
    window.MotionEngine = MotionEngine;
  } catch (e) {}
}
