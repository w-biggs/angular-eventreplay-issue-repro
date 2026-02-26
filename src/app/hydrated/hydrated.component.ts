import {
  afterNextRender,
  ApplicationRef,
  Component,
  inject,
  OnDestroy,
  OnInit, output,
  PendingTasks,
  PLATFORM_ID,
  signal
} from '@angular/core';
import {SkipEventReplayDirective} from '../skip-event-replay.directive';
import {isPlatformBrowser} from '@angular/common';

interface ClickEntry {
  index: number;
  time: string;
  status: string;
}

@Component({
  selector: 'hydrated',
  templateUrl: './hydrated.component.html',
  styleUrl: './hydrated.component.css',
})
export class HydratedComponent implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private appRef = inject(ApplicationRef);

  readonly isStable = signal(false);
  readonly totalClicks = signal(0);
  readonly doubleFires = signal(0);
  readonly clickLog = signal<ClickEntry[]>([]);

  readonly isHydrated = output<boolean>();

  private receivedClickTimestamps = new Set<number>();
  private hydratedTime = 0;

  constructor() {
    // afterNextRender only runs in the browser, after the component is hydrated
    // and the DOM is interactive — this is exactly when Angular hands off from
    // the SSR snapshot to the live application.
    afterNextRender(() => {
      this.hydratedTime = performance.now();
      this.isHydrated.emit(true);
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.appRef.whenStable().then(() => {
      this.isStable.set(true);
    });
  }

  onButtonClick(event: PointerEvent): void {
    console.log(event);

    this.totalClicks.update((n) => n + 1);

    // A click that fires while the app is still unstable is a real user click
    // that will be queued for replay. A click that fires once the app is stable
    // drains that queue — the first such click per pending entry is the replay.
    let isDuplicate = false;
    if (this.receivedClickTimestamps.has(event.timeStamp)) {
      isDuplicate = true;
      this.doubleFires.update((n) => n + 1);
    } else if (!this.isStable()) {
      this.receivedClickTimestamps.add(event.timeStamp);
    }

    const time = new Date().toLocaleTimeString('en', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    let status = '';

    if (event.timeStamp < this.hydratedTime) {
      status = 'good-replay';
    } else if (isDuplicate) {
      status = 'bad-replay';
    } else {
      status = 'normal';
    }

    this.clickLog.update((log) => [
      {
        index: this.totalClicks(),
        time,
        status,
      },
      ...log,
    ]);
  }
}
