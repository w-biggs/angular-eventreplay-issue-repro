/** @format */

import { Injectable, inject, ApplicationRef } from '@angular/core';
import { EventPhase } from '@angular/core/primitives/event-dispatch';

@Injectable({ providedIn: 'root' })
export class EventReplayDedupeService {
  private appRef = inject(ApplicationRef);
  private handledEvents = new WeakSet<Event>();
  private isStable = false;

  constructor() {
    this.appRef.whenStable().then(() => {
      this.isStable = true;
    });
  }

  isDuplicate(event: Event): boolean {
    if (this.handledEvents.has(event)) {
      return true;
    }

    // No need to add events that are mid-replay or occur after the app has become stable.
    if (!this.isStable && event.eventPhase !== EventPhase.REPLAY) {
      this.handledEvents.add(event);
    }

    return false;
  }
}
