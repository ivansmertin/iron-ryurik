# Visual Foundation (Replaceable Contract)

## Goal
Define an interim visual contract that is easy to replace when final designer mockups arrive.

## Style Direction
- `hybrid`: clean information-first base with restrained sporty accents.
- UI priorities: readability, hierarchy, predictable spacing, consistent interaction states.

## Token Source of Truth
- Theme tokens: `src/app/globals.css`
- Typography variables: `src/app/layout.tsx` (`Geist`, `Geist_Mono`)

## Component Contract

### Form Controls
- `Input`: `src/components/ui/input.tsx`
- `Textarea`: `src/components/ui/textarea.tsx`
- `Select`: `src/components/ui/select.tsx`
- `Checkbox`: `src/components/ui/checkbox.tsx`
- Rule: do not use raw styled HTML controls in feature forms unless there is no matching primitive.

### Actions
- `Button`: `src/components/ui/button.tsx`
- States to preserve in all variants: `default`, `hover`, `focus-visible`, `active`, `disabled`, `aria-invalid`.

### Feedback
- `InlineMessage`: `src/components/ui/inline-message.tsx`
- `FieldError`: `src/components/admin/field-error.tsx`
- Rule: no hardcoded semantic colors in form pages; use shared message primitives.

### Information Containers
- `Card` family: `src/components/ui/card.tsx`
- `Table`: `src/components/ui/table.tsx`
- `TabLinks`: `src/components/admin/tab-links.tsx`
- `PageHeader`: `src/components/admin/page-header.tsx`

## Visual Rules
- Radius: rely on tokenized radii from theme (`--radius-*`).
- Focus: preserve visible focus ring for keyboard accessibility.
- Density: keep control heights consistent across forms.
- Contrast: semantic tones must remain legible in both light and dark themes.

## Extension Points for Future Design
- Token layer (`globals.css`) can be swapped without touching business logic.
- Primitive variants (`Button`, `Input`, `Select`, `Badge`) are the safe customization layer.
- Role pages should consume primitives, not custom local visual styles.
