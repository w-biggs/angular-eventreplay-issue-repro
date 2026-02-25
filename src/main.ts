import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { ApplicationRef } from '@angular/core';
import { first } from 'rxjs/operators';

bootstrapApplication(App, appConfig)
  .then((app) => {
    let bootstrapStartTime = performance.now();

    const applicationRef = app.injector.get(ApplicationRef);
    applicationRef.isStable
      .pipe(first((stable) => stable))
      .subscribe((stable) => {
        if (stable) {
          const stabilityTime = performance.now() - bootstrapStartTime;
          console.log(
            `Zone debugging - Application stable after ${stabilityTime.toFixed(2)}ms`
          );
        }
      });
  })
  .catch((err) => console.error(err));
