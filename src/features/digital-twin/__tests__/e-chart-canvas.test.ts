import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EChartCanvas from "../components/dashboard/EChartCanvas.vue";

const chartMocks = vi.hoisted(() => ({
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  animationStart: vi.fn(),
  animationStop: vi.fn(),
  init: vi.fn(),
  use: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}));

vi.mock("echarts/charts", () => ({
  BarChart: {},
  GaugeChart: {},
  LineChart: {},
  PieChart: {},
  RadarChart: {},
}));
vi.mock("echarts/components", () => ({
  DataZoomComponent: {},
  GraphicComponent: {},
  GridComponent: {},
  LegendComponent: {},
  RadarComponent: {},
  TooltipComponent: {},
}));
vi.mock("echarts/renderers", () => ({ CanvasRenderer: {} }));
vi.mock("echarts/core", () => ({
  init: chartMocks.init,
  use: chartMocks.use,
}));

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();

  constructor(readonly callback: ResizeObserverCallback) {
    ResizeObserverMock.instances.push(this);
  }

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

describe("EChartCanvas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ResizeObserverMock.instances = [];
    chartMocks.init.mockReturnValue({
      setOption: chartMocks.setOption,
      resize: chartMocks.resize,
      dispose: chartMocks.dispose,
      on: chartMocks.on,
      off: chartMocks.off,
      getZr: () => ({
        animation: {
          start: chartMocks.animationStart,
          stop: chartMocks.animationStop,
        },
      }),
    });
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  it("limits canvas DPR, coalesces resize work, updates options and disposes", async () => {
    const scheduledFrames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      scheduledFrames.push(callback);
      return scheduledFrames.length;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 3,
    });

    const wrapper = mount(EChartCanvas, {
      props: {
        option: { series: [{ type: "bar", data: [1] }] },
        ariaLabelText: "测试图表",
      },
    });

    expect(chartMocks.init).toHaveBeenCalledWith(
      wrapper.element,
      undefined,
      { renderer: "canvas", devicePixelRatio: 2 },
    );
    expect(chartMocks.setOption).toHaveBeenCalledTimes(1);
    expect(wrapper.attributes("role")).toBe("img");
    expect(wrapper.attributes("aria-label")).toBe("测试图表");

    await wrapper.setProps({ option: { series: [{ type: "line", data: [2] }] } });
    await nextTick();
    expect(chartMocks.setOption).toHaveBeenCalledTimes(2);

    const observer = ResizeObserverMock.instances[0]!;
    observer.trigger();
    observer.trigger();
    expect(scheduledFrames).toHaveLength(1);
    scheduledFrames[0]?.(0);
    expect(chartMocks.resize).toHaveBeenCalledTimes(1);

    wrapper.unmount();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
    expect(chartMocks.dispose).toHaveBeenCalledTimes(1);
  });

  it("stops chart animation while the document is hidden and refreshes on return", async () => {
    const hidden = vi.spyOn(document, "hidden", "get");
    hidden.mockReturnValue(false);
    const wrapper = mount(EChartCanvas, {
      props: {
        option: { series: [{ type: "bar", data: [1] }] },
        ariaLabelText: "后台休眠测试",
      },
    });
    hidden.mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(chartMocks.animationStop).toHaveBeenCalledOnce();

    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event("visibilitychange"));
    await nextTick();
    expect(chartMocks.animationStart).toHaveBeenCalledOnce();
    expect(chartMocks.setOption).toHaveBeenCalledTimes(2);
    wrapper.unmount();
    hidden.mockRestore();
  });

  it("forwards ECharts legend selection as a generic chart event", () => {
    const wrapper = mount(EChartCanvas, {
      props: {
        option: { series: [{ type: "radar", data: [] }] },
        ariaLabelText: "图例交互测试",
      },
    });
    const handler = chartMocks.on.mock.calls.find(
      ([event]) => event === "legendselectchanged",
    )?.[1] as ((event: { selected: Record<string, boolean> }) => void) | undefined;

    handler?.({ selected: { 跑步: true, 跳远: false } });

    expect(wrapper.emitted("legendSelectionChange")?.[0])
      .toEqual([{ 跑步: true, 跳远: false }]);
    wrapper.unmount();
    expect(chartMocks.off).toHaveBeenCalledWith("legendselectchanged");
  });
});
