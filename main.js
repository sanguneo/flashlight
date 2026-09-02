"use strict";

const stage = document.getElementById("stage");
const arm = document.getElementById("arm");
const pivotEl = document.getElementById("pivot");
const tipEl = document.getElementById("tip");
const reveal = document.getElementById("reveal");
const beam = document.getElementById("beam");
const bulb = document.getElementById("bulb");
const toggle = document.getElementById("toggle");

const REST_ANGLE = -36;      // 껐을 때 팔 각도
const MIN_ANGLE = -104;      // 위로 최대
const MAX_ANGLE = 12;        // 아래로 최대
const HALF_SPREAD = 10.5;    // 빛의 밝은 중심 반각(도)
const EDGE_FEATHER = 8;      // 좌우 경계가 흐려지는 폭(도)

let on = true;
let pointer = null;
let angle = REST_ANGLE;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** 0x0 마커의 화면 좌표 */
function markerPoint(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top };
}

function computeTarget() {
  if (!on || !pointer) return REST_ANGLE;
  const p = markerPoint(pivotEl);
  const deg = (Math.atan2(pointer.y - p.y, pointer.x - p.x) * 180) / Math.PI;
  return clamp(deg, MIN_ANGLE, MAX_ANGLE);
}

function paintLight() {
  const apex = markerPoint(tipEl);
  bulb.style.transform = `translate(${apex.x}px, ${apex.y}px)`;
  if (!on) return;

  const ax = apex.x.toFixed(1);
  const ay = apex.y.toFixed(1);
  const diag = Math.hypot(window.innerWidth, window.innerHeight);

  // CSS conic 각도는 12시 방향 기준 시계방향 → 화면각 + 90
  const from = angle + 90 - HALF_SPREAD - EDGE_FEATHER;
  const inner = EDGE_FEATHER;
  const outer = EDGE_FEATHER + HALF_SPREAD * 2;
  const end = outer + EDGE_FEATHER;

  const cone =
    `conic-gradient(from ${from.toFixed(2)}deg at ${ax}px ${ay}px,` +
    ` rgba(0,0,0,0) 0deg,` +
    ` rgba(0,0,0,.55) ${(inner * 0.55).toFixed(2)}deg,` +
    ` rgba(0,0,0,1) ${inner.toFixed(2)}deg,` +
    ` rgba(0,0,0,1) ${outer.toFixed(2)}deg,` +
    ` rgba(0,0,0,.55) ${(outer + EDGE_FEATHER * 0.45).toFixed(2)}deg,` +
    ` rgba(0,0,0,0) ${end.toFixed(2)}deg,` +
    ` rgba(0,0,0,0) 360deg)`;

  const revealFall =
    `radial-gradient(circle ${(diag * 1.3).toFixed(0)}px at ${ax}px ${ay}px,` +
    ` rgba(0,0,0,1) 0%, rgba(0,0,0,1) 38%, rgba(0,0,0,.8) 66%,` +
    ` rgba(0,0,0,.35) 86%, rgba(0,0,0,0) 100%)`;

  const beamFall =
    `radial-gradient(circle ${(diag * 0.85).toFixed(0)}px at ${ax}px ${ay}px,` +
    ` rgba(0,0,0,1) 0%, rgba(0,0,0,.6) 40%, rgba(0,0,0,.22) 72%, rgba(0,0,0,0) 100%)`;

  setMask(reveal, `${cone}, ${revealFall}`);
  setMask(beam, `${cone}, ${beamFall}`);
}

function setMask(el, value) {
  el.style.maskImage = value;
  el.style.webkitMaskImage = value;
}

function frame() {
  const target = computeTarget();
  const delta = target - angle;
  angle = Math.abs(delta) > 0.02 ? angle + delta * 0.16 : target;
  arm.style.transform = `rotate(${angle.toFixed(2)}deg)`;
  paintLight();
  requestAnimationFrame(frame);
}

/* ---------- 입력 ---------- */
function setOn(next) {
  on = next;
  stage.classList.toggle("is-on", on);
  toggle.textContent = on ? "손전등 끄기" : "손전등 켜기";
  toggle.setAttribute("aria-pressed", String(on));
}

window.addEventListener("pointermove", (e) => {
  pointer = { x: e.clientX, y: e.clientY };
});

stage.addEventListener("click", () => setOn(!on));

toggle.addEventListener("click", (e) => {
  e.stopPropagation();
  setOn(!on);
});

window.addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.key === " ") {
    e.preventDefault();
    setOn(!on);
  }
});

requestAnimationFrame(frame);
