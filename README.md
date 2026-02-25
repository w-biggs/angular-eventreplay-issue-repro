# Angular Event Replay — Double-Fire Repro

Minimal reproduction of an Angular SSR bug: when event replay is enabled and a component becomes interactive before the app is stable, a click registered during that window fires twice — once on click, and once when event replay runs at stability.

## Running

```bash
npm install
npm run build
npm run serve:ssr
```

Then open `http://localhost:4000`, and click the button while the app is still unstable (within the first ~8 seconds). Each click should fire once. If the event log shows a REPLAY entry, the bug is present.
