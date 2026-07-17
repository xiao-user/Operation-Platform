<!--
  Vue 3 port of orb-ui's CloudTheme.
  Original: Copyright (c) 2026 Alexander Chen
  License: MIT
  Source: https://github.com/alexanderqchen/orb-ui
-->
<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type CSSProperties,
} from 'vue'

defineOptions({
  name: 'CloudOrb',
  inheritAttrs: false,
})

type CloudOrbState = 'listening' | 'thinking' | 'speaking'

interface CloudOrbProps {
  state?: CloudOrbState
  volume?: number
  size?: number
  diameterRatio?: number
  maxDpr?: number
  interactive?: boolean
  disabled?: boolean
  paused?: boolean
  ariaLabel?: string
}

const props = withDefaults(defineProps<CloudOrbProps>(), {
  state: 'thinking',
  volume: 0,
  size: 200,
  diameterRatio: 0.55,
  maxDpr: 2,
  interactive: false,
  disabled: false,
  paused: false,
  ariaLabel: 'AI voice orb',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

interface CloudRenderer {
  draw(time: number, activity: number): void
  destroy(): void
}

const VERTEX_SHADER = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_activity;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.52;
  mat2 rotation = mat2(0.80, 0.60, -0.60, 0.80);

  for (int octave = 0; octave < 5; octave++) {
    value += amplitude * noise(p);
    p = rotation * p * 1.92 + vec2(9.7, 4.3);
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 centered = uv - 0.5;
  float radius = length(centered);
  float edge = 1.0 - smoothstep(0.488, 0.5, radius);

  if (edge <= 0.0) discard;

  vec2 p = centered * 2.0;
  float t = u_time;

  vec2 warp = vec2(
    fbm(p * 1.02 + vec2(t * 0.34, -t * 0.24)),
    fbm(p * 1.08 + vec2(-t * 0.27, t * 0.32) + vec2(6.7, 2.9))
  );

  vec2 curl = vec2(
    sin(p.y * 2.4 + t * 0.68 + warp.y * 3.2),
    cos(p.x * 2.1 - t * 0.61 + warp.x * 3.0)
  );

  vec2 warped =
    p +
    (warp - 0.5) * (1.18 + u_activity * 0.38) +
    curl * (0.035 + u_activity * 0.07);

  float broad = fbm(warped * 0.92 + vec2(t * 0.14, -t * 0.18));
  float folded = fbm(warped * 1.66 + vec2(-t * 0.23, t * 0.19) + 5.2);
  float field = mix(broad, folded, 0.3 + u_activity * 0.14);

  float horizon =
    0.46 +
    0.08 * sin((uv.x + warp.x * 0.2) * 5.4 + t * 0.42) +
    0.16 * (broad - 0.5);

  float upper = smoothstep(horizon - 0.12, horizon + 0.08, uv.y);
  float band = exp(-pow((uv.y - horizon) * (5.2 + u_activity * 0.8), 2.0));
  float cloud = smoothstep(0.24, 0.79, field);

  vec3 deepPeriwinkle = vec3(0.36, 0.39, 0.985);
  vec3 upperPeriwinkle = vec3(0.48, 0.56, 0.985);
  vec3 lowerLavender = vec3(0.72, 0.78, 0.975);
  vec3 milk = vec3(0.89, 0.92, 0.995);

  vec3 color = mix(lowerLavender, upperPeriwinkle, upper);
  float upperDepth = upper * (0.14 + smoothstep(0.42, 0.78, folded) * 0.5);
  color = mix(color, deepPeriwinkle, upperDepth);

  float milkAmount = clamp(band * (0.42 + cloud * 0.62), 0.0, 0.88);
  color = mix(color, milk, milkAmount);

  float lowerMist = (1.0 - upper) * smoothstep(0.58, 0.9, broad) * 0.18;
  color = mix(color, milk, lowerMist);

  float grain = (noise(gl_FragCoord.xy * 0.64) - 0.5) / 255.0;
  color += grain;

  gl_FragColor = vec4(color, edge);
}
`

const LISTEN_SHRINK = 0.204
const SPEAK_GROW = 0.2145
const DOT_SCALE = 0.063
const LAUNCH_DOT_COLOR = '#5659dc'
const ENTRANCE_OVERSHOOT = 1.178
const DOT_HOLD_MS = 180
const GROW_MS = 300
const SETTLE_MS = 1350
const SURFACE_FADE_START_MS = DOT_HOLD_MS + GROW_MS * 0.22
const SURFACE_FADE_END_MS = DOT_HOLD_MS + GROW_MS * 0.8
const DOT_FADE_START_MS = DOT_HOLD_MS + GROW_MS * 0.58
const DOT_FADE_END_MS = DOT_HOLD_MS + GROW_MS

const rootRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const launchDotRef = ref<HTMLSpanElement | null>(null)

const diameter = computed(() => {
  const ratio = clamp(props.diameterRatio, 0.1, 1)
  return Math.max(1, props.size * ratio)
})

const rootStyle = computed<CSSProperties>(() => ({
  width: `${Math.max(1, props.size)}px`,
  height: `${Math.max(1, props.size)}px`,
}))

const surfaceStyle = computed<CSSProperties>(() => ({
  width: `${diameter.value}px`,
  height: `${diameter.value}px`,
  cursor: props.interactive
    ? props.disabled
      ? 'not-allowed'
      : 'pointer'
    : 'default',
}))

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function damp(current: number, target: number, rate: number, deltaSeconds: number) {
  return current + (target - current) * (1 - Math.exp(-rate * deltaSeconds))
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3)
}

function mix(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}

function smoothstepRange(value: number, start: number, end: number) {
  const progress = clamp((value - start) / (end - start))
  return progress * progress * (3 - 2 * progress)
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | undefined {
  const shader = gl.createShader(type)
  if (!shader) return undefined

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[CloudOrb] Shader compilation failed:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return undefined
  }

  return shader
}

function createCloudRenderer(
  canvas: HTMLCanvasElement,
  cssDiameter: number,
  maxDpr: number,
): CloudRenderer | undefined {
  let gl: WebGLRenderingContext | null = null
  try {
    gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    })
  } catch {
    return undefined
  }

  if (!gl) return undefined

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)

  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader)
    if (fragmentShader) gl.deleteShader(fragmentShader)
    return undefined
  }

  const program = gl.createProgram()
  const buffer = gl.createBuffer()

  if (!program || !buffer) {
    if (program) gl.deleteProgram(program)
    if (buffer) gl.deleteBuffer(buffer)
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    return undefined
  }

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('[CloudOrb] Shader link failed:', gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    gl.deleteBuffer(buffer)
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    return undefined
  }

  const positionLocation = gl.getAttribLocation(program, 'a_position')
  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
  const timeLocation = gl.getUniformLocation(program, 'u_time')
  const activityLocation = gl.getUniformLocation(program, 'u_activity')

  if (positionLocation < 0 || !resolutionLocation || !timeLocation || !activityLocation) {
    gl.deleteProgram(program)
    gl.deleteBuffer(buffer)
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    return undefined
  }

  const pixelRatio = Math.min(
    Math.max(1, window.devicePixelRatio || 1),
    Math.max(1, maxDpr),
  )
  const pixelSize = Math.max(1, Math.round(cssDiameter * pixelRatio))

  canvas.width = pixelSize
  canvas.height = pixelSize

  gl.viewport(0, 0, pixelSize, pixelSize)
  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  )
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
  gl.uniform2f(resolutionLocation, pixelSize, pixelSize)

  return {
    draw(time, activity) {
      gl.uniform1f(timeLocation, time)
      gl.uniform1f(activityLocation, activity)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    },
    destroy() {
      gl.deleteProgram(program)
      gl.deleteBuffer(buffer)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
    },
  }
}

function entranceScale(elapsed: number) {
  if (elapsed <= DOT_HOLD_MS) return DOT_SCALE

  if (elapsed <= DOT_HOLD_MS + GROW_MS) {
    const progress = easeOutCubic((elapsed - DOT_HOLD_MS) / GROW_MS)
    return mix(DOT_SCALE, ENTRANCE_OVERSHOOT, progress)
  }

  const settleElapsed = elapsed - DOT_HOLD_MS - GROW_MS
  if (settleElapsed >= SETTLE_MS) return 1

  const progress = clamp(settleElapsed / SETTLE_MS)
  return 1 + (ENTRANCE_OVERSHOOT - 1) * Math.pow(1 - progress, 2)
}

let renderer: CloudRenderer | undefined
let frame = 0
let motionQuery: MediaQueryList | undefined
let intersectionObserver: IntersectionObserver | undefined
let reducedMotion = false
let intersectsViewport = true
let pageVisible = true
let previousTime = 0
let entranceStarted: number | undefined
let currentVolume = clamp(props.volume)
let currentAudioScale = 1
let flowTime = 0

function shouldRun() {
  return !props.paused && intersectsViewport && pageVisible
}

function stopLoop() {
  if (frame) {
    cancelAnimationFrame(frame)
    frame = 0
  }
}

function renderFrame(now: number) {
  const canvas = canvasRef.value
  const launchDot = launchDotRef.value
  if (!canvas || !launchDot) return

  const deltaSeconds = Math.min(Math.max((now - previousTime) / 1000, 0), 0.05)
  previousTime = now

  const nextState = props.state

  const rawVolume = clamp(props.volume)
  const volumeRate = rawVolume > currentVolume ? 11 : 6
  currentVolume = reducedMotion
    ? 0
    : damp(currentVolume, rawVolume, volumeRate, deltaSeconds)

  let audioScaleTarget = 1
  if (nextState === 'listening') audioScaleTarget = 1 - currentVolume * LISTEN_SHRINK
  if (nextState === 'speaking') audioScaleTarget = 1 + currentVolume * SPEAK_GROW

  const scaleRate =
    Math.abs(audioScaleTarget - 1) > Math.abs(currentAudioScale - 1) ? 12 : 6
  currentAudioScale = reducedMotion
    ? 1
    : damp(currentAudioScale, audioScaleTarget, scaleRate, deltaSeconds)

  let scale = currentAudioScale
  let surfaceMix = 1
  let launchDotOpacity = 0

  if (entranceStarted !== undefined && !reducedMotion) {
    const elapsed = now - entranceStarted
    const entrance = entranceScale(elapsed)
    const audioInfluence = clamp((elapsed - DOT_HOLD_MS - GROW_MS) / SETTLE_MS)

    scale = entrance * mix(1, currentAudioScale, audioInfluence)
    surfaceMix = smoothstepRange(elapsed, SURFACE_FADE_START_MS, SURFACE_FADE_END_MS)
    launchDotOpacity = 1 - smoothstepRange(elapsed, DOT_FADE_START_MS, DOT_FADE_END_MS)

    if (elapsed >= DOT_HOLD_MS + GROW_MS + SETTLE_MS) {
      entranceStarted = undefined
    }
  }

  canvas.style.opacity = String(surfaceMix)
  canvas.style.transform = `scale(${scale})`
  launchDot.style.opacity = String(launchDotOpacity)
  launchDot.style.transform = `scale(${scale})`

  let speed = 0.24
  let activity = 0.1

  if (nextState === 'listening') {
    speed = 0.72 + currentVolume * 0.78
    activity = 0.28 + currentVolume * 0.32
  } else if (nextState === 'speaking') {
    speed = 1.65 + currentVolume * 1.55
    activity = 0.66 + currentVolume * 0.34
  }

  if (!reducedMotion) flowTime += deltaSeconds * speed
  renderer?.draw(flowTime, activity)
}

function renderLoop(now: number) {
  frame = 0
  renderFrame(now)

  if (shouldRun() && !reducedMotion) {
    frame = requestAnimationFrame(renderLoop)
  }
}

function syncLoop() {
  stopLoop()

  if (!shouldRun()) return

  previousTime = performance.now()

  if (reducedMotion) {
    renderFrame(previousTime)
    return
  }

  frame = requestAnimationFrame(renderLoop)
}

function onMotionPreferenceChange() {
  reducedMotion = Boolean(motionQuery?.matches)
  syncLoop()
}

function onVisibilityChange() {
  pageVisible = !document.hidden
  syncLoop()
}

function observeRoot() {
  intersectionObserver?.disconnect()
  intersectionObserver = undefined
  intersectsViewport = true

  const root = rootRef.value
  if (!root || typeof IntersectionObserver === 'undefined') return

  intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      intersectsViewport = entry?.isIntersecting ?? true
      syncLoop()
    },
    { threshold: 0.01 },
  )
  intersectionObserver.observe(root)
}

function cleanup() {
  stopLoop()
  intersectionObserver?.disconnect()
  intersectionObserver = undefined

  if (motionQuery) {
    if (typeof motionQuery.removeEventListener === 'function') {
      motionQuery.removeEventListener('change', onMotionPreferenceChange)
    } else {
      motionQuery.removeListener(onMotionPreferenceChange)
    }
  }
  motionQuery = undefined

  document.removeEventListener('visibilitychange', onVisibilityChange)
  renderer?.destroy()
  renderer = undefined
}

async function initialize() {
  await nextTick()

  const canvas = canvasRef.value
  if (!canvas || !launchDotRef.value) return

  if (typeof window.matchMedia === 'function') {
    motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion = motionQuery.matches
    if (typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', onMotionPreferenceChange)
    } else {
      motionQuery.addListener(onMotionPreferenceChange)
    }
  } else {
    motionQuery = undefined
    reducedMotion = false
  }

  pageVisible = !document.hidden
  document.addEventListener('visibilitychange', onVisibilityChange)

  renderer = createCloudRenderer(canvas, diameter.value, props.maxDpr)
  if (!renderer) {
    canvas.style.background =
      'linear-gradient(180deg, #626afb 2%, #8f9dfb 32%, #dde6fd 52%, #c9d3fb 84%)'
  } else {
    canvas.style.background = 'transparent'
  }

  previousTime = performance.now()
  entranceStarted = previousTime
  currentVolume = clamp(props.volume)
  currentAudioScale = 1
  flowTime = 0

  observeRoot()
  syncLoop()
}

function handleClick(event: MouseEvent) {
  if (!props.interactive || props.disabled) return
  emit('click', event)
}

watch(
  () => [props.size, props.diameterRatio, props.maxDpr, props.interactive] as const,
  async () => {
    cleanup()
    await initialize()
  },
)

watch(
  () => props.paused,
  () => syncLoop(),
)

watch(
  () => [props.state, props.volume, props.disabled] as const,
  () => {
    if (reducedMotion) renderFrame(performance.now())
  },
)

onMounted(initialize)
onBeforeUnmount(cleanup)
</script>

<template>
  <component
    :is="interactive ? 'button' : 'div'"
    ref="rootRef"
    v-bind="$attrs"
    class="cloud-orb"
    :class="{
      'cloud-orb--interactive': interactive,
      'cloud-orb--disabled': disabled,
    }"
    :style="rootStyle"
    :type="interactive ? 'button' : undefined"
    :disabled="interactive ? disabled : undefined"
    :aria-label="interactive ? ariaLabel : undefined"
    :aria-hidden="interactive ? undefined : 'true'"
    :data-state="state"
    @click="handleClick"
  >
    <span class="cloud-orb__surface" :style="surfaceStyle">
      <span
        ref="launchDotRef"
        class="cloud-orb__launch-dot"
        aria-hidden="true"
      />
      <canvas
        ref="canvasRef"
        class="cloud-orb__canvas"
        aria-hidden="true"
      />
    </span>
  </component>
</template>

<style scoped>
.cloud-orb {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 0;
  padding: 0;
  margin: 0;
  overflow: visible;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: 0;
  appearance: none;
  -webkit-appearance: none;
  contain: layout style;
}

.cloud-orb--interactive {
  cursor: pointer;
}

.cloud-orb--disabled {
  cursor: not-allowed;
}

.cloud-orb__surface {
  position: relative;
  display: block;
  flex: 0 0 auto;
  border-radius: 50%;
  line-height: 0;
}

.cloud-orb__launch-dot,
.cloud-orb__canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  opacity: 0;
  transform: scale(0.063);
  transform-origin: center;
  will-change: opacity, transform;
}

.cloud-orb__launch-dot {
  background: v-bind(LAUNCH_DOT_COLOR);
}

.cloud-orb__canvas {
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .cloud-orb__launch-dot,
  .cloud-orb__canvas {
    will-change: auto;
  }
}
</style>
