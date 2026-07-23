<script setup lang="ts">
import { gsap } from "gsap";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { digitalTwinMotion } from "../motion";

const props = withDefaults(defineProps<{
  value: number;
  formatter?: (value: number) => string;
  precision?: number;
}>(), {
  precision: 0,
});

const displayedValue = ref(0);
let reducedMotion = false;
let numberTween: gsap.core.Tween | undefined;
let motionMedia: ReturnType<typeof gsap.matchMedia> | undefined;

function animateToValue(value: number) {
  numberTween?.kill();
  if (reducedMotion) {
    displayedValue.value = value;
    return;
  }

  const state = { value: displayedValue.value };
  numberTween = gsap.to(state, {
    value,
    duration: digitalTwinMotion.countDuration,
    ease: digitalTwinMotion.countEase,
    overwrite: true,
    onUpdate: () => {
      const precision = Math.max(0, Math.min(6, Math.round(props.precision)));
      const factor = 10 ** precision;
      displayedValue.value = Math.round(state.value * factor) / factor;
    },
  });
}

onMounted(() => {
  if (typeof window.matchMedia !== "function") {
    reducedMotion = true;
    displayedValue.value = props.value;
    return;
  }
  motionMedia = gsap.matchMedia();
  motionMedia.add(
    {
      allowMotion: "(prefers-reduced-motion: no-preference)",
      reduceMotion: "(prefers-reduced-motion: reduce)",
    },
    (context) => {
      reducedMotion = Boolean(context.conditions?.reduceMotion);
      animateToValue(props.value);
      return () => numberTween?.kill();
    },
  );
});

watch([() => props.value, () => props.precision], ([value]) => animateToValue(value));

onBeforeUnmount(() => {
  numberTween?.kill();
  motionMedia?.revert();
});
</script>

<template>
  <span class="animated-number">{{ formatter ? formatter(displayedValue) : displayedValue }}</span>
</template>
