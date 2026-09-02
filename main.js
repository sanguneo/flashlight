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

let on = false;
let pointer = null;
let angle = REST_ANGLE;
let holding = false;         // 터치를 누르고 있는 중인가
let touchMode = false;       // hover가 없는 입력 장치인가
let maskKey = "";            // 마스크 재계산 생략용

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

  // 팔 각도와 뷰포트가 그대로면 마스크는 다시 만들 필요가 없다 (모바일에서 특히 비쌈)
  const key = `${angle.toFixed(2)}|${window.innerWidth}x${window.innerHeight}`;
  if (key === maskKey) return;
  maskKey = key;

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

/* ---------- 상태 ---------- */
function setOn(next) {
  if (next === on) return;
  on = next;
  maskKey = "";
  stage.classList.toggle("is-on", on);
  toggle.textContent = on ? "손전등 끄기" : "손전등 켜기";
  toggle.setAttribute("aria-pressed", String(on));
}

/**
 * 터치 기기는 hover가 없으니 조작 모델을 바꾼다.
 * - 마우스: 기본으로 켜져 있고, 커서를 따라가며, 클릭/Space로 토글
 * - 터치:   기본으로 꺼져 있고, 누르고 있는 동안만 켜져서 손끝을 따라감
 */
function setTouchMode(next) {
  if (next === touchMode) return;
  touchMode = next;
  document.documentElement.classList.toggle("touch", touchMode);
  pointer = null;
  setOn(!touchMode);
}

setTouchMode(matchMedia("(hover: none), (pointer: coarse)").matches);
setOn(!touchMode);

/* ---------- 입력 ---------- */
stage.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse") return;
  e.preventDefault();
  setTouchMode(true);
  holding = true;
  pointer = { x: e.clientX, y: e.clientY };
  setOn(true);
  // 캡처는 손끝이 무대 밖으로 나가도 계속 따라오게 하는 보강일 뿐이라 마지막에
  stage.setPointerCapture(e.pointerId);
});

window.addEventListener("pointermove", (e) => {
  if (e.pointerType === "mouse") {
    setTouchMode(false);
    pointer = { x: e.clientX, y: e.clientY };
    return;
  }
  if (holding) pointer = { x: e.clientX, y: e.clientY };
});

function release(e) {
  if (!holding) return;
  holding = false;
  if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
  pointer = null;
  setOn(false);
}

stage.addEventListener("pointerup", release);
stage.addEventListener("pointercancel", release);

stage.addEventListener("click", () => {
  if (!touchMode) setOn(!on);
});

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

// 회전/리사이즈로 마커 위치가 바뀌면 마스크를 다시 그린다
window.addEventListener("resize", () => { maskKey = ""; });
window.addEventListener("orientationchange", () => { maskKey = ""; });

requestAnimationFrame(frame);
