import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EChartCanvas from "../components/dashboard/EChartCanvas.vue";

const chartMocks = vi.hoisted(() => ({
  setOption: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  init: vi.fn(),
  use: vi.fn(),
}));

vi.mock("echarts/charts", () => ({ BarChart: {}, LineChart: {} }));
vi.mock("echarts/components", () => ({
  DataZoomComponent: {},
  GridComponent: {},
  LegendComponent: {},
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
});
