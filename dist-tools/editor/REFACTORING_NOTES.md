# Refactoring Notes

## Priority Targets

1. Split shape path geometry from rendering.
   - Move Bezier helpers, path construction, flattening, and hit geometry out of `modules/render/shape-render.js`.
   - Keep drawing code focused on canvas rendering.
   - Reuse the same path helpers for render and hit-test to avoid behavior drift.

2. Split shape pointer editing from the global pointer orchestrator.
   - Keep `pointer-orchestrator-controller.js` as a dispatcher.
   - Move shape creation, point editing, Bezier handle dragging, and shape snapping into a dedicated shape input controller.

3. Make the properties panel schema-driven.
   - Extend `props-schema.js` to cover visibility, sync, apply, events, and commit keys.
   - Reduce duplicated field lists in `props-panel-feature.js`.

4. Break `main.js` into feature composers.
   - Keep `main.js` as bootstrapping only.
   - Move project, rendering, tools, panels, and export wiring into separate composition modules.

5. Split toolbar submenu behavior from generic toolbar behavior.
   - Move tool cycle menu pointer/touch state into its own controller.
   - Use an explicit tooltip dependency instead of DOM bridge events.

6. Split i18n dictionaries.
   - Move locales to separate files.
   - Prefer stable keys over Russian strings as lookup keys for new UI.

7. Split hit-test concerns.
   - Separate shape, note, screen, rig padding, and editable-object hit testing.
   - Avoid special cases inside a single generic `hit` function.
