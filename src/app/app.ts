import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  PLATFORM_ID,
  ApplicationRef,
  PendingTasks,
  signal,
  afterNextRender,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { filter, first } from 'rxjs/operators';

interface ClickEntry {
  index: number;
  time: string;
  appWasStable: boolean;
  isReplay: boolean;
}

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  // How long (seconds) to keep the zone unstable after hydration, giving a
  // window in which to click and trigger the event-replay double-fire bug.
  readonly STABILITY_DELAY_S = 8;

  private platformId = inject(PLATFORM_ID);
  private appRef = inject(ApplicationRef);
  private pendingTasks = inject(PendingTasks);

  isHydrated = signal(false);
  isStable = signal(false);
  countdown = signal(this.STABILITY_DELAY_S);
  totalClicks = signal(0);
  doubleFires = signal(0);
  clickLog = signal<ClickEntry[]>([]);

  // Counts clicks that occurred while the app was unstable and are awaiting replay.
  private pendingReplays = 0;
  private stabilitySubscription?: Subscription;
  private countdownInterval?: ReturnType<typeof setInterval>;

  constructor() {
    // afterNextRender only runs in the browser, after the component is hydrated
    // and the DOM is interactive — this is exactly when Angular hands off from
    // the SSR snapshot to the live application.
    afterNextRender(() => {
      this.isHydrated.set(true);
    });

    if (isPlatformBrowser(this.platformId)) {
      // PendingTasks explicitly tells Angular the app is not yet stable.
      // Calling the returned cleanup function removes the task and allows
      // ApplicationRef.isStable to emit true, which triggers event replay.
      const removePendingTask = this.pendingTasks.add();

      this.countdownInterval = setInterval(() => {
        this.countdown.update((n) => Math.max(0, n - 1));
      }, 1000);

      setTimeout(() => {
        clearInterval(this.countdownInterval);
        this.countdown.set(0);
        removePendingTask();
      }, this.STABILITY_DELAY_S * 1000);
    }
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // ApplicationRef.isStable is what Angular's own event-replay mechanism
    // subscribes to — it is the authoritative signal that replay will fire.
    this.stabilitySubscription = this.appRef.isStable
      .pipe(
        filter((stable) => stable),
        first(),
      )
      .subscribe(() => this.isStable.set(true));
  }

  ngOnDestroy(): void {
    this.stabilitySubscription?.unsubscribe();
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  onButtonClick(): void {
    this.totalClicks.update((n) => n + 1);

    // A click that fires while the app is still unstable is a real user click
    // that will be queued for replay. A click that fires once the app is stable
    // drains that queue — the first such click per pending entry is the replay.
    let isReplay = false;
    if (!this.isStable()) {
      this.pendingReplays++;
    } else if (this.pendingReplays > 0) {
      isReplay = true;
      this.pendingReplays--;
      this.doubleFires.update((n) => n + 1);
    }

    const time = new Date().toLocaleTimeString('en', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    this.clickLog.update((log) => [
      {
        index: this.totalClicks(),
        time,
        appWasStable: this.isStable(),
        isReplay,
      },
      ...log,
    ]);
  }
}

