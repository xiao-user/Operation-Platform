export interface AutoFocusTourAdapter {
  isVisible(): boolean;
  isTownshipScope(): boolean;
  currentTownshipCode(): string | undefined;
  townshipCodes(): readonly string[];
  enterTownship(code: string): Promise<boolean>;
  leaveTownship(): Promise<boolean>;
  districtDwellDurationMs(): number;
  townshipDwellDurationMs(): number;
}

export class AutoFocusTour {
  private timer?: number;
  private runId = 0;
  private started = false;

  constructor(private readonly adapter: AutoFocusTourAdapter) {}

  start() {
    if (this.started) return;
    this.started = true;
    this.armIdleTimer();
  }

  notifyUserActivity() {
    if (!this.started) return;
    this.cancelCurrentRun();
    this.armIdleTimer();
  }

  handleVisibilityChange() {
    if (!this.started) return;
    this.cancelCurrentRun();
    if (this.adapter.isVisible()) this.armIdleTimer();
  }

  dispose() {
    this.started = false;
    this.cancelCurrentRun();
  }

  private clearTimer() {
    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.timer = undefined;
  }

  private cancelCurrentRun() {
    this.runId += 1;
    this.clearTimer();
  }

  private schedule(runId: number, delayMs: number, callback: () => void) {
    this.clearTimer();
    this.timer = window.setTimeout(() => {
      this.timer = undefined;
      if (!this.isCurrentRun(runId)) return;
      callback();
    }, Math.max(0, delayMs));
  }

  private isCurrentRun(runId: number) {
    return this.started
      && runId === this.runId
      && this.adapter.isVisible();
  }

  private armIdleTimer() {
    if (!this.started || !this.adapter.isVisible()) return;
    const runId = this.runId;
    this.schedule(runId, this.adapter.districtDwellDurationMs(), () => {
      void this.beginTownshipRound(runId);
    });
  }

  private async beginTownshipRound(runId: number) {
    const codes = [...this.adapter.townshipCodes()];
    if (codes.length === 0) {
      this.armIdleTimer();
      return;
    }
    const currentCode = this.adapter.isTownshipScope()
      ? this.adapter.currentTownshipCode()
      : undefined;
    const currentIndex = currentCode ? codes.indexOf(currentCode) : -1;
    const orderedCodes = currentIndex >= 0
      ? [...codes.slice(currentIndex), ...codes.slice(0, currentIndex)]
      : codes;
    await this.visitTownship(runId, orderedCodes, 0, currentIndex >= 0);
  }

  private async visitTownship(
    runId: number,
    codes: readonly string[],
    index: number,
    alreadyFocused: boolean,
  ) {
    if (!this.isCurrentRun(runId)) return;
    if (index >= codes.length) {
      await this.finishTownshipRound(runId);
      return;
    }
    if (!alreadyFocused) {
      const entered = await this.adapter.enterTownship(codes[index]!);
      if (!this.isCurrentRun(runId)) return;
      if (!entered) {
        await this.visitTownship(runId, codes, index + 1, false);
        return;
      }
    }
    this.schedule(runId, this.adapter.townshipDwellDurationMs(), () => {
      void this.visitTownship(runId, codes, index + 1, false);
    });
  }

  private async finishTownshipRound(runId: number) {
    if (this.adapter.isTownshipScope()) await this.adapter.leaveTownship();
    if (!this.isCurrentRun(runId)) return;
    this.armIdleTimer();
  }
}
