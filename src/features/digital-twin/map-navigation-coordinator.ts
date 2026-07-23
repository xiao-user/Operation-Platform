export type MapNavigationOrigin = "user" | "automatic";

export interface MapNavigationTransaction {
  readonly signal: AbortSignal;
  isCurrent(): boolean;
  finish(): void;
}

interface ActiveNavigation {
  id: number;
  controller: AbortController;
}

/**
 * Owns navigation concurrency for every map mode. Automatic navigation waits
 * for an idle map, while a user navigation always supersedes the active task.
 */
export class MapNavigationCoordinator {
  private sequence = 0;
  private active?: ActiveNavigation;

  constructor(private readonly onBusyChange: (busy: boolean) => void) {}

  begin(origin: MapNavigationOrigin): MapNavigationTransaction | undefined {
    if (origin === "automatic" && this.active) return undefined;

    const previous = this.active;
    const active: ActiveNavigation = {
      id: ++this.sequence,
      controller: new AbortController(),
    };
    this.active = active;
    previous?.controller.abort();
    if (!previous) this.onBusyChange(true);

    return {
      signal: active.controller.signal,
      isCurrent: () => this.active?.id === active.id,
      finish: () => this.finish(active.id),
    };
  }

  dispose() {
    const active = this.active;
    this.active = undefined;
    active?.controller.abort();
    if (active) this.onBusyChange(false);
  }

  private finish(id: number) {
    if (this.active?.id !== id) return;
    this.active = undefined;
    this.onBusyChange(false);
  }
}
