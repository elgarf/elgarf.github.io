# LED Editor Structure

## Goals
- Keep `tools/LEDMaskEditor.html` as bootstrap + wiring, not business logic dump.
- Group code by **feature/domain**, not by tiny helper method.
- Avoid creating a new file for every small function.

## Recommended module layout
- `modules/features/`:
  - Feature-level facades that compose several lower-level controllers.
  - One feature file may orchestrate multiple tools/actions.
- `modules/ui/`:
  - Reusable UI controllers and low-level input pieces.
- `modules/render/`:
  - Rendering pipeline and draw stages.
- `modules/calc/`:
  - Region/flow calculations, cache keys, workers.
- `modules/project/`:
  - Project lifecycle, serialization, persistence, IO.
- `modules/spec/`:
  - Specification/export text builders.
- `modules/utils/`:
  - Pure helpers.

## Practical rules
- Prefer 1 file per feature slice, not per method.
- If 2-5 controllers are always wired together, create a feature facade in `modules/features/`.
- Keep DI objects named (`...Deps`) in HTML and avoid deeply nested inline objects.
- Preserve behavior first; structural refactor should be no-op functionally.
