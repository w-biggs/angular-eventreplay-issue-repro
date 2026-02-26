import {
  Component,
  OnInit,
  inject,
  PLATFORM_ID,
  ApplicationRef,
  PendingTasks,
  signal,
  afterNextRender,
  ViewContainerRef,
  viewChild, outputBinding,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {HydratedComponent} from '../hydrated/hydrated.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.html',
  styleUrl: 'app.css',
})
export class App implements OnInit {
  // How long (seconds) to keep the zone unstable after hydration, giving a
  // window in which to click and trigger the event-replay double-fire bug.
  readonly STABILITY_DELAY_S = 8;

  private platformId = inject(PLATFORM_ID);
  private appRef = inject(ApplicationRef);
  private pendingTasks = inject(PendingTasks);

  readonly isStable = signal(false);
  readonly isChildHydrated = signal(false);
  readonly countdown = signal(this.STABILITY_DELAY_S);

  private countdownInterval = setInterval(() => {
    this.countdown.update((n) => Math.max(0, n - 1));
  }, 1000);

  private hydratedContainer = viewChild.required('hydratedComponentContainer', { read: ViewContainerRef });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // PendingTasks explicitly tells Angular the app is not yet stable.
      // Calling the returned cleanup function removes the task and allows
      // ApplicationRef.isStable to emit true, which triggers event replay.
      const removePendingTask = this.pendingTasks.add();

      setTimeout(() => {
        clearInterval(this.countdownInterval);
        this.countdown.set(0);
        removePendingTask();
      }, this.STABILITY_DELAY_S * 1000);
    }
  }

  ngOnInit(): void {
    const container = this.hydratedContainer();

    if (isPlatformBrowser(this.platformId)) {
      // Delay creating the hydrated component by 2 seconds to simulate delayed hydration
      setTimeout(() => {
        this.createChildComponent();
      }, 4000);
    } else {
      this.createChildComponent();
    }

    if (!isPlatformBrowser(this.platformId)) return;

    this.appRef.whenStable().then(() => {
      this.isStable.set(true);
    });
  }

  createChildComponent() {
    this.hydratedContainer().createComponent(HydratedComponent, {
      bindings: [
        outputBinding<boolean>('isHydrated', (v) => this.isChildHydrated.set(v))
      ]
    });
  }
}

