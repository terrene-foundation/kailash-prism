# 03 Component Contracts Specification

Spec version: 0.1.0 | Status: DRAFT | Governs: Abstract component definitions, state machines, props interfaces, accessibility requirements, responsive behavior, token consumption

---

## 3.1 Contract Format

Every component in the Prism library is defined by a YAML contract. The contract is the single source of truth for that component's behavior across all platforms. Implementation code MUST conform to its contract; any deviation is a spec violation.

### 3.1.1 Contract Schema

```yaml
name: string                    # PascalCase component name (e.g., "Button")
category: "atom" | "molecule" | "organism"
description: string             # One-line purpose statement

props:
  - name: string                # camelCase prop name
    type: string                # TypeScript-style type expression
    required: boolean
    default: any | null         # Default value; null means no default
    description: string         # What this prop controls

states:
  initial: string               # Name of the initial state
  states:
    - name: string              # State name
      description: string       # When the component is in this state
  transitions:
    - from: string | string[]   # Source state(s), or "*" for any
      to: string                # Target state
      trigger: string           # What causes this transition
      visual_change: string     # What visually changes

variants:
  - name: string                # Variant name (e.g., "primary")
    description: string         # Visual description referencing token names

accessibility:
  role: string                  # ARIA role (e.g., "button", "textbox", "checkbox")
  aria_attributes:
    - attribute: string         # ARIA attribute name
      source: string            # Where the value comes from
      required: boolean
  keyboard:
    - key: string               # Key or key combo (e.g., "Enter", "Space", "Escape")
      action: string            # What happens
  focus:
    tabindex: string            # "0" (naturally focusable) or "-1" (programmatic only)
    focus_visible: boolean      # Whether focus ring is shown
    trap: boolean               # Whether focus is trapped inside (for modals)
  screen_reader:
    label_source: string        # Where the accessible name comes from
    announcements: string[]     # Dynamic ARIA live announcements

responsive:
  - breakpoint: string          # "mobile" | "tablet" | "desktop" | "wide"
    behavior: string            # Description of behavior at this breakpoint

tokens:
  consumes: string[]            # List of component token paths (e.g., "button.primary.bg")
  inherits_from: string | null  # Parent component whose tokens are inherited
```

### 3.1.2 Token Inheritance (`inherits_from`)

When `inherits_from` is set to a parent component name (e.g., `"Button"`), the child component inherits the parent's Tier 3 token set as its base. Token resolution follows these rules:

1. **Copy all parent tokens**: The child starts with a complete copy of the parent's token set for all variants and states
2. **Override selectively**: Any token explicitly defined in the child's own token set overrides the inherited value
3. **Add new tokens**: Tokens defined in the child that do not exist in the parent are added
4. **Variant mapping**: If the child has different variants than the parent, only matching variant names inherit. Non-matching variants get no inherited tokens and must be fully specified.

Example: `IconButton` inherits from `Button`. It inherits all of Button's `primary`, `secondary`, `tertiary`, `destructive`, `ghost` variant tokens. It overrides `padding` and `height` to accommodate icon-only sizing.

### 3.1.3 Required Fields

Every contract MUST include all top-level keys: `name`, `category`, `description`, `props`, `states`, `variants`, `accessibility`, `responsive`, `tokens`.

A contract is VALID if:
1. All required fields are present
2. `name` matches `^[A-Z][a-zA-Z]+$` (PascalCase, no numbers or hyphens)
3. `category` is one of the three permitted values
4. Every prop has `name`, `type`, `required`, `default`, `description`
5. `states.initial` matches one of the `states.states[].name` values
6. Every `transitions[].from` value matches a state name or is `"*"`
7. Every `transitions[].to` value matches a state name
8. `accessibility.role` is a valid WAI-ARIA role
9. At least one keyboard interaction is defined for interactive components
10. `tokens.consumes` lists at least one token path for visible components

### 3.1.4 Type Expressions

Props use TypeScript-style type expressions. Supported forms:

| Expression | Meaning |
|-----------|---------|
| `string` | Any string |
| `number` | Any number |
| `boolean` | true or false |
| `ReactNode` | Any renderable content (web: React.ReactNode; Flutter: Widget) |
| `"a" \| "b" \| "c"` | String literal union |
| `IconName` | A named icon from the icon set |
| `() => void` | Callback with no args, no return |
| `(value: T) => void` | Callback with typed argument |
| `T[]` | Array of T |
| `{ key: T; ... }` | Object shape |
| `T \| undefined` | Optional value |

---

## 3.2 Atom Contracts

### 3.2.1 Button

```yaml
name: Button
category: atom
description: "Triggers an action when clicked. The primary interactive element."

props:
  - name: variant
    type: '"primary" | "secondary" | "tertiary" | "destructive" | "ghost"'
    required: false
    default: "primary"
    description: "Visual style variant"
  - name: size
    type: '"sm" | "md" | "lg"'
    required: false
    default: "md"
    description: "Height: sm=32px, md=40px, lg=44px"
  - name: children
    type: ReactNode
    required: true
    default: null
    description: "Button label content"
  - name: disabled
    type: boolean
    required: false
    default: false
    description: "Whether the button is non-interactive"
  - name: loading
    type: boolean
    required: false
    default: false
    description: "Shows spinner and disables interaction"
  - name: iconLeft
    type: IconName | undefined
    required: false
    default: null
    description: "Icon displayed before the label"
  - name: iconRight
    type: IconName | undefined
    required: false
    default: null
    description: "Icon displayed after the label"
  - name: fullWidth
    type: boolean
    required: false
    default: false
    description: "Whether the button expands to fill its container width"
  - name: type
    type: '"button" | "submit" | "reset"'
    required: false
    default: "button"
    description: "HTML button type attribute"
  - name: onClick
    type: "() => void"
    required: false
    default: null
    description: "Click handler"

states:
  initial: default
  states:
    - name: default
      description: "Idle state, ready for interaction"
    - name: hover
      description: "Cursor is over the button"
    - name: active
      description: "Button is being pressed"
    - name: focus
      description: "Button has keyboard focus"
    - name: disabled
      description: "Button is non-interactive"
    - name: loading
      description: "Action is in progress, shows spinner"
  transitions:
    - from: default
      to: hover
      trigger: "Mouse enters"
      visual_change: "Background shifts to hover color"
    - from: hover
      to: default
      trigger: "Mouse leaves"
      visual_change: "Background returns to default"
    - from: [default, hover]
      to: active
      trigger: "Mouse down or Enter/Space key down"
      visual_change: "Scale to 0.98, background shifts to active color"
    - from: active
      to: [default, hover]
      trigger: "Mouse up or key up"
      visual_change: "Scale returns to 1.0"
    - from: "*"
      to: focus
      trigger: "Tab key focuses button"
      visual_change: "Focus ring appears (2px, ring_color, 2px offset)"
    - from: focus
      to: default
      trigger: "Tab key moves focus away"
      visual_change: "Focus ring removed"
    - from: "*"
      to: disabled
      trigger: "disabled prop set to true"
      visual_change: "Opacity 0.6, cursor not-allowed"
    - from: "*"
      to: loading
      trigger: "loading prop set to true"
      visual_change: "Label replaced by Spinner, interaction disabled"
    - from: [disabled, loading]
      to: default
      trigger: "disabled/loading prop set to false"
      visual_change: "Returns to default appearance"

variants:
  - name: primary
    description: "Filled bg=interactive.primary, text=text.on-primary. For primary page actions."
  - name: secondary
    description: "Outlined border=border.default, text=text.primary. For secondary actions."
  - name: tertiary
    description: "No border or bg, text=interactive.primary. For low-emphasis inline actions."
  - name: destructive
    description: "Filled bg=interactive.destructive, text=text.on-destructive. For delete/remove."
  - name: ghost
    description: "Transparent bg, text=text.secondary. For toolbar and icon-only buttons."

accessibility:
  role: "button"
  aria_attributes:
    - attribute: "aria-disabled"
      source: "disabled prop"
      required: true
    - attribute: "aria-busy"
      source: "loading prop"
      required: true
    - attribute: "aria-label"
      source: "Computed from children text content, or explicit aria-label prop"
      required: false
  keyboard:
    - key: "Enter"
      action: "Triggers onClick"
    - key: "Space"
      action: "Triggers onClick (with preventDefault to avoid scroll)"
  focus:
    tabindex: "0"
    focus_visible: true
    trap: false
  screen_reader:
    label_source: "Text content of children, or aria-label prop"
    announcements:
      - "When loading: announces 'Loading' via aria-busy"

responsive:
  - breakpoint: mobile
    behavior: "Full width when fullWidth=true. Touch target minimum 44px height."
  - breakpoint: tablet
    behavior: "Same as mobile"
  - breakpoint: desktop
    behavior: "Inline width by default. Hover states active."
  - breakpoint: wide
    behavior: "Same as desktop"

tokens:
  consumes:
    - "button.{variant}.bg"
    - "button.{variant}.text"
    - "button.{variant}.border"
    - "button.{variant}.radius"
    - "button.{variant}.height"
    - "button.{variant}.padding_x"
    - "button.{variant}.font_size"
    - "button.{variant}.font_weight"
    - "button.{variant}.hover.bg"
    - "button.{variant}.active.bg"
    - "button.{variant}.focus.ring_color"
    - "button.{variant}.focus.ring_width"
    - "button.{variant}.focus.ring_offset"
    - "button.{variant}.disabled.bg"
    - "button.{variant}.disabled.text"
    - "button.{variant}.disabled.opacity"
  inherits_from: null
```

### 3.2.2 IconButton

```yaml
name: IconButton
category: atom
description: "Icon-only button with required tooltip for accessibility."

props:
  - name: icon
    type: IconName
    required: true
    default: null
    description: "Icon to display"
  - name: label
    type: string
    required: true
    default: null
    description: "Accessible label (shown as tooltip)"
  - name: variant
    type: '"primary" | "secondary" | "tertiary" | "destructive" | "ghost"'
    required: false
    default: "ghost"
    description: "Visual style variant"
  - name: size
    type: '"sm" | "md" | "lg"'
    required: false
    default: "md"
    description: "Height: sm=32px, md=40px, lg=44px"
  - name: disabled
    type: boolean
    required: false
    default: false
    description: "Non-interactive state"
  - name: loading
    type: boolean
    required: false
    default: false
    description: "Shows spinner replacing icon"
  - name: onClick
    type: "() => void"
    required: false
    default: null
    description: "Click handler"

states:
  initial: default
  states:
    - name: default
      description: "Idle state"
    - name: hover
      description: "Cursor over, tooltip visible after delay"
    - name: active
      description: "Being pressed"
    - name: focus
      description: "Has keyboard focus, tooltip visible"
    - name: disabled
      description: "Non-interactive"
    - name: loading
      description: "Action in progress"
  transitions:
    - from: default
      to: hover
      trigger: "Mouse enters"
      visual_change: "Background tint appears, tooltip shown after 500ms delay"
    - from: hover
      to: default
      trigger: "Mouse leaves"
      visual_change: "Background tint removed, tooltip hidden"
    - from: [default, hover]
      to: active
      trigger: "Mouse down or Enter/Space key"
      visual_change: "Scale to 0.95"
    - from: active
      to: [default, hover]
      trigger: "Mouse up or key up"
      visual_change: "Scale returns to 1.0"
    - from: "*"
      to: focus
      trigger: "Tab key"
      visual_change: "Focus ring, tooltip shown immediately"
    - from: "*"
      to: disabled
      trigger: "disabled=true"
      visual_change: "Opacity 0.6"
    - from: "*"
      to: loading
      trigger: "loading=true"
      visual_change: "Icon replaced by Spinner"

variants:
  - name: primary
    description: "Same color scheme as Button primary but square/circular shape"
  - name: secondary
    description: "Outlined variant"
  - name: tertiary
    description: "Text-colored, no background"
  - name: destructive
    description: "Destructive color scheme"
  - name: ghost
    description: "Transparent, icon inherits text color. Default for toolbar icons."

accessibility:
  role: "button"
  aria_attributes:
    - attribute: "aria-label"
      source: "label prop (REQUIRED)"
      required: true
    - attribute: "aria-disabled"
      source: "disabled prop"
      required: true
  keyboard:
    - key: "Enter"
      action: "Triggers onClick"
    - key: "Space"
      action: "Triggers onClick"
  focus:
    tabindex: "0"
    focus_visible: true
    trap: false
  screen_reader:
    label_source: "label prop"
    announcements: []

responsive:
  - breakpoint: mobile
    behavior: "Touch target 44px minimum regardless of visual size"
  - breakpoint: desktop
    behavior: "Visual size matches size prop; hover shows tooltip"

tokens:
  consumes:
    - "button.{variant}.*"  # Inherits all button variant tokens
  inherits_from: "Button"
```

### 3.2.3 TextInput

```yaml
name: TextInput
category: atom
description: "Single-line text input field for user data entry."

props:
  - name: value
    type: string
    required: false
    default: ""
    description: "Controlled input value"
  - name: placeholder
    type: string
    required: false
    default: ""
    description: "Placeholder text when empty"
  - name: type
    type: '"text" | "email" | "password" | "tel" | "url" | "search" | "number"'
    required: false
    default: "text"
    description: "HTML input type"
  - name: disabled
    type: boolean
    required: false
    default: false
    description: "Non-interactive state"
  - name: readOnly
    type: boolean
    required: false
    default: false
    description: "Visible but not editable"
  - name: error
    type: boolean
    required: false
    default: false
    description: "Whether the input is in error state"
  - name: maxLength
    type: number | undefined
    required: false
    default: null
    description: "Maximum character count"
  - name: iconLeft
    type: IconName | undefined
    required: false
    default: null
    description: "Icon at the start of the input"
  - name: iconRight
    type: IconName | undefined
    required: false
    default: null
    description: "Icon at the end of the input (or clear button)"
  - name: onChange
    type: "(value: string) => void"
    required: false
    default: null
    description: "Value change handler"
  - name: onFocus
    type: "() => void"
    required: false
    default: null
    description: "Focus handler"
  - name: onBlur
    type: "() => void"
    required: false
    default: null
    description: "Blur handler"

states:
  initial: empty
  states:
    - name: empty
      description: "No value, placeholder visible"
    - name: filled
      description: "Has value, placeholder hidden"
    - name: focus
      description: "Active input cursor"
    - name: error
      description: "Validation failure indicated"
    - name: disabled
      description: "Non-interactive, dimmed"
    - name: readonly
      description: "Visible content, no editing"
  transitions:
    - from: empty
      to: focus
      trigger: "Click or tab into field"
      visual_change: "Border color changes to interactive.primary, focus ring appears"
    - from: focus
      to: filled
      trigger: "User types and blurs"
      visual_change: "Border returns to default, value displayed"
    - from: focus
      to: empty
      trigger: "User clears and blurs"
      visual_change: "Placeholder reappears"
    - from: [empty, filled]
      to: error
      trigger: "error prop set to true"
      visual_change: "Border changes to status.error"
    - from: error
      to: [empty, filled]
      trigger: "error prop set to false"
      visual_change: "Border returns to default"
    - from: "*"
      to: disabled
      trigger: "disabled=true"
      visual_change: "Background dimmed, cursor not-allowed"
    - from: "*"
      to: readonly
      trigger: "readOnly=true"
      visual_change: "No cursor change, no border highlight on focus"

variants:
  - name: default
    description: "Standard input with border.default border on surface.card background"
  - name: error
    description: "status.error border, error helper text"
  - name: disabled
    description: "Dimmed surface.page background, border.subtle border, text.disabled text"

accessibility:
  role: "textbox"
  aria_attributes:
    - attribute: "aria-invalid"
      source: "error prop"
      required: true
    - attribute: "aria-disabled"
      source: "disabled prop"
      required: true
    - attribute: "aria-readonly"
      source: "readOnly prop"
      required: true
    - attribute: "aria-describedby"
      source: "ID of associated help text or error message"
      required: false
    - attribute: "aria-label"
      source: "Explicit label or associated Label component"
      required: false
  keyboard:
    - key: "Tab"
      action: "Move focus to/from input"
    - key: "Escape"
      action: "Clear input if search type, otherwise no action"
  focus:
    tabindex: "0"
    focus_visible: true
    trap: false
  screen_reader:
    label_source: "Associated Label component via htmlFor/id, or aria-label"
    announcements:
      - "When error: announces error message via aria-describedby"

responsive:
  - breakpoint: mobile
    behavior: "Full width, height=44px for touch target compliance"
  - breakpoint: desktop
    behavior: "Width determined by container, height from size prop"

tokens:
  consumes:
    - "input.default.bg"
    - "input.default.text"
    - "input.default.placeholder"
    - "input.default.border"
    - "input.default.radius"
    - "input.default.height"
    - "input.default.padding_x"
    - "input.default.font_size"
    - "input.focus.border"
    - "input.focus.ring_color"
    - "input.focus.ring_width"
    - "input.error.border"
    - "input.error.ring_color"
    - "input.disabled.bg"
    - "input.disabled.text"
    - "input.disabled.border"
  inherits_from: null
```

### 3.2.4 TextArea

```yaml
name: TextArea
category: atom
description: "Multi-line text input with optional auto-grow behavior."

props:
  - name: value
    type: string
    required: false
    default: ""
    description: "Controlled value"
  - name: placeholder
    type: string
    required: false
    default: ""
    description: "Placeholder when empty"
  - name: rows
    type: number
    required: false
    default: 3
    description: "Initial visible rows"
  - name: maxRows
    type: number | undefined
    required: false
    default: null
    description: "Maximum rows before scrolling (if autoGrow=true)"
  - name: autoGrow
    type: boolean
    required: false
    default: false
    description: "Whether height expands with content"
  - name: disabled
    type: boolean
    required: false
    default: false
    description: "Non-interactive"
  - name: readOnly
    type: boolean
    required: false
    default: false
    description: "Visible but not editable"
  - name: error
    type: boolean
    required: false
    default: false
    description: "Error state"
  - name: maxLength
    type: number | undefined
    required: false
    default: null
    description: "Maximum character count"
  - name: resize
    type: '"none" | "vertical" | "horizontal" | "both"'
    required: false
    default: "vertical"
    description: "Resize handle behavior (web only)"
  - name: onChange
    type: "(value: string) => void"
    required: false
    default: null
    description: "Value change handler"

states:
  initial: empty
  states:
    - name: empty
      description: "No value"
    - name: filled
      description: "Has value"
    - name: focus
      description: "Active editing"
    - name: error
      description: "Validation failure"
    - name: disabled
      description: "Non-interactive"
    - name: readonly
      description: "Read-only"
  transitions:
    - from: empty
      to: focus
      trigger: "Click or tab"
      visual_change: "Border changes to interactive.primary"
    - from: [empty, filled]
      to: error
      trigger: "error=true"
      visual_change: "Border changes to status.error"
    - from: "*"
      to: disabled
      trigger: "disabled=true"
      visual_change: "Dimmed appearance"

variants:
  - name: default
    description: "Same visual treatment as TextInput default"
  - name: error
    description: "Same as TextInput error"
  - name: disabled
    description: "Same as TextInput disabled"

accessibility:
  role: "textbox"
  aria_attributes:
    - attribute: "aria-multiline"
      source: "Always true"
      required: true
    - attribute: "aria-invalid"
      source: "error prop"
      required: true
  keyboard:
    - key: "Tab"
      action: "Move focus (does NOT insert tab character)"
    - key: "Enter"
      action: "Inserts newline"
  focus:
    tabindex: "0"
    focus_visible: true
    trap: false
  screen_reader:
    label_source: "Associated Label component"
    announcements: []

responsive:
  - breakpoint: mobile
    behavior: "Full width, autoGrow recommended for mobile"
  - breakpoint: desktop
    behavior: "Width from container, resize handle visible"

tokens:
  consumes:
    - "input.*"  # Reuses TextInput token set
  inherits_from: "TextInput"
```

### 3.2.5 Select

```yaml
name: Select
category: atom
description: "Dropdown selector for choosing from a list of options."

props:
  - name: value
    type: "string | string[]"
    required: false
    default: null
    description: "Selected value(s)"
  - name: options
    type: "{ value: string; label: string; disabled?: boolean; group?: string }[]"
    required: true
    default: null
    description: "Available options"
  - name: placeholder
    type: string
    required: false
    default: "Select..."
    description: "Placeholder when no selection"
  - name: multiple
    type: boolean
    required: false
    default: false
    description: "Allow multiple selections"
  - name: searchable
    type: boolean
    required: false
    default: false
    description: "Allow typing to filter options"
  - name: disabled
    type: boolean
    required: false
    default: false
    description: "Non-interactive"
  - name: error
    type: boolean
    required: false
    default: false
    description: "Error state"
  - name: onChange
    type: "(value: string | string[]) => void"
    required: false
    default: null
    description: "Selection change handler"

states:
  initial: closed
  states:
    - name: closed
      description: "Dropdown is collapsed"
    - name: open
      description: "Dropdown is expanded, options visible"
    - name: filtered
      description: "Open with search filter applied (searchable=true)"
    - name: empty
      description: "Open but no options match filter"
    - name: error
      description: "Validation error"
    - name: disabled
      description: "Non-interactive"
  transitions:
    - from: closed
      to: open
      trigger: "Click, Enter, Space, or ArrowDown"
      visual_change: "Options list appears below with shadow.dropdown"
    - from: open
      to: closed
      trigger: "Selection made, Escape, click outside, or Tab"
      visual_change: "Options list disappears"
    - from: open
      to: filtered
      trigger: "User types in search field (searchable=true)"
      visual_change: "Options filtered to matches"
    - from: filtered
      to: empty
      trigger: "Search yields no matches"
      visual_change: "Empty state message shown"

variants:
  - name: default
    description: "Same border treatment as TextInput"
  - name: error
    description: "Error border and message"
  - name: disabled
    description: "Dimmed, non-interactive"

accessibility:
  role: "combobox"
  aria_attributes:
    - attribute: "aria-expanded"
      source: "Whether dropdown is open"
      required: true
    - attribute: "aria-haspopup"
      source: "Always 'listbox'"
      required: true
    - attribute: "aria-activedescendant"
      source: "ID of currently highlighted option"
      required: true
    - attribute: "aria-invalid"
      source: "error prop"
      required: true
  keyboard:
    - key: "ArrowDown"
      action: "Open dropdown or move highlight to next option"
    - key: "ArrowUp"
      action: "Move highlight to previous option"
    - key: "Enter"
      action: "Select highlighted option"
    - key: "Space"
      action: "Select highlighted option (when not searchable)"
    - key: "Escape"
      action: "Close dropdown"
    - key: "Home"
      action: "Highlight first option"
    - key: "End"
      action: "Highlight last option"
    - key: "Any letter"
      action: "If searchable, filters. If not, jumps to first option starting with that letter"
  focus:
    tabindex: "0"
    focus_visible: true
    trap: false
  screen_reader:
    label_source: "Associated Label component"
    announcements:
      - "When opened: announces number of options"
      - "When option highlighted: announces option label"
      - "When selected: announces 'Selected {label}'"

responsive:
  - breakpoint: mobile
    behavior: "Full width. Options may use native picker or bottom sheet."
  - breakpoint: desktop
    behavior: "Floating options list positioned below trigger"

tokens:
  consumes:
    - "input.*"
    - "dropdown-menu.*"
  inherits_from: "TextInput"
```

### 3.2.6 Checkbox

```yaml
name: Checkbox
category: atom
description: "Binary or tri-state selection control."

props:
  - name: checked
    type: boolean
    required: false
    default: false
    description: "Whether checked"
  - name: indeterminate
    type: boolean
    required: false
    default: false
    description: "Partial selection state (parent of mixed children)"
  - name: disabled
    type: boolean
    required: false
    default: false
    description: "Non-interactive"
  - name: label
    type: string
    required: true
    default: null
    description: "Visible label text"
  - name: onChange
    type: "(checked: boolean) => void"
    required: false
    default: null
    description: "Change handler"

states:
  initial: unchecked
  states:
    - name: unchecked
      description: "Empty box"
    - name: checked
      description: "Box with checkmark icon"
    - name: indeterminate
      description: "Box with dash/minus icon"
    - name: disabled
      description: "Dimmed, non-interactive"
  transitions:
    - from: unchecked
      to: checked
      trigger: "Click or Space key"
      visual_change: "Checkmark icon appears with micro animation"
    - from: checked
      to: unchecked
      trigger: "Click or Space key"
      visual_change: "Checkmark removed"
    - from: unchecked
      to: indeterminate
      trigger: "indeterminate prop set true"
      visual_change: "Dash icon appears"
    - from: indeterminate
      to: checked
      trigger: "Click or Space key"
      visual_change: "Dash replaced by checkmark"

variants:
  - name: unchecked
    description: "Empty box, border.default border"
  - name: checked
    description: "Filled box bg=interactive.primary, white checkmark"
  - name: indeterminate
    description: "Filled box bg=interactive.primary, white dash"

accessibility:
  role: "checkbox"
  aria_attributes:
    - attribute: "aria-checked"
      source: "checked: true/false, indeterminate: 'mixed'"
      required: true
    - attribute: "aria-disabled"
      source: "disabled prop"
      required: true
  keyboard:
    - key: "Space"
      action: "Toggle checked state"
  focus:
    tabindex: "0"
    focus_visible: true
    trap: false
  screen_reader:
    label_source: "label prop"
    announcements:
      - "State change: announces 'checked' or 'not checked' or 'partially checked'"

responsive:
  - breakpoint: mobile
    behavior: "Touch target 44px (checkbox + label click area)"
  - breakpoint: desktop
    behavior: "Standard 20px checkbox with label"

tokens:
  consumes:
    - "checkbox.unchecked.bg"
    - "checkbox.unchecked.border"
    - "checkbox.checked.bg"
    - "checkbox.checked.icon_color"
    - "checkbox.indeterminate.bg"
    - "checkbox.disabled.opacity"
    - "checkbox.focus.ring_color"
  inherits_from: null
```

### 3.2.7 Radio

```yaml
name: Radio
category: atom
description: "Single-selection control within a group."

props:
  - name: value
    type: string
    required: true
    default: null
    description: "Value this radio represents"
  - name: checked
    type: boolean
    required: false
    default: false
    description: "Whether selected"
  - name: disabled
    type: boolean
    required: false
    default: false
    description: "Non-interactive"
  - name: label
    type: string
    required: true
    default: null
    description: "Visible label"
  - name: name
    type: string
    required: true
    default: null
    description: "Radio group name"
  - name: onChange
    type: "(value: string) => void"
    required: false
    default: null
    description: "Selection handler"

states:
  initial: unselected
  states:
    - name: unselected
      description: "Empty circle"
    - name: selected
      description: "Circle with filled inner dot"
    - name: disabled
      description: "Dimmed"
  transitions:
    - from: unselected
      to: selected
      trigger: "Click or Space key"
      visual_change: "Inner dot appears with micro animation"
    - from: selected
      to: unselected
      trigger: "Another radio in group selected"
      visual_change: "Inner dot removed"

variants:
  - name: unselected
    description: "Empty circle, border.default"
  - name: selected
    description: "Circle with interactive.primary filled dot"

accessibility:
  role: "radio"
  aria_attributes:
    - attribute: "aria-checked"
      source: "checked prop"
      required: true
  keyboard:
    - key: "ArrowDown / ArrowRight"
      action: "Select next radio in group"
    - key: "ArrowUp / ArrowLeft"
      action: "Select previous radio in group"
    - key: "Space"
      action: "Select current radio"
  focus:
    tabindex: "0 for selected or first in group, -1 for others"
    focus_visible: true
    trap: false
  screen_reader:
    label_source: "label prop"
    announcements:
      - "Announces 'selected' when chosen"
      - "Announces position: 'N of M' in group"

responsive:
  - breakpoint: mobile
    behavior: "44px touch target. Stack vertically."
  - breakpoint: desktop
    behavior: "Can stack vertically or arrange horizontally"

tokens:
  consumes:
    - "radio.unselected.bg"
    - "radio.unselected.border"
    - "radio.selected.bg"
    - "radio.selected.dot_color"
    - "radio.disabled.opacity"
    - "radio.focus.ring_color"
  inherits_from: null
```

### 3.2.8 Toggle

```yaml
name: Toggle
category: atom
description: "Binary on/off switch for settings."

props:
  - name: checked
    type: boolean
    required: false
    default: false
    description: "On/off state"
  - name: disabled
    type: boolean
    required: false
    default: false
    description: "Non-interactive"
  - name: label
    type: string
    required: true
    default: null
    description: "Accessible label"
  - name: onChange
    type: "(checked: boolean) => void"
    required: false
    default: null
    description: "Toggle handler"

states:
  initial: off
  states:
    - name: off
      description: "Track is inactive color, thumb on left"
    - name: on
      description: "Track is interactive.primary, thumb on right"
    - name: disabled
      description: "Dimmed, non-interactive"
  transitions:
    - from: off
      to: on
      trigger: "Click or Space key"
      visual_change: "Thumb slides right, track color transitions to primary"
    - from: on
      to: off
      trigger: "Click or Space key"
      visual_change: "Thumb slides left, track color transitions to inactive"

variants:
  - name: "off"
    description: "Inactive track bg=border.default, white thumb"
  - name: "on"
    description: "Active track bg=interactive.primary, white thumb"

accessibility:
  role: "switch"
  aria_attributes:
    - attribute: "aria-checked"
      source: "checked prop"
      required: true
  keyboard:
    - key: "Space"
      action: "Toggle state"
    - key: "Enter"
      action: "Toggle state"
  focus:
    tabindex: "0"
    focus_visible: true
    trap: false
  screen_reader:
    label_source: "label prop"
    announcements:
      - "Announces 'on' or 'off'"

responsive:
  - breakpoint: mobile
    behavior: "44px touch target, track width 44px"
  - breakpoint: desktop
    behavior: "Track width 36px"

tokens:
  consumes:
    - "toggle.off.track_bg"
    - "toggle.off.thumb_bg"
    - "toggle.on.track_bg"
    - "toggle.on.thumb_bg"
    - "toggle.disabled.opacity"
    - "toggle.focus.ring_color"
  inherits_from: null
```

### 3.2.9 Label

```yaml
name: Label
category: atom
description: "Text label associated with a form field."

props:
  - name: children
    type: ReactNode
    required: true
    default: null
    description: "Label text"
  - name: htmlFor
    type: string
    required: false
    default: null
    description: "ID of associated form field"
  - name: required
    type: boolean
    required: false
    default: false
    description: "Shows required indicator"
  - name: optional
    type: boolean
    required: false
    default: false
    description: "Shows (optional) text"
  - name: error
    type: boolean
    required: false
    default: false
    description: "Error color"

states:
  initial: default
  states:
    - name: default
      description: "Standard label"
    - name: required
      description: "Shows required asterisk (*) in error color"
    - name: optional
      description: "Shows '(optional)' in secondary text"
    - name: error
      description: "Label text in error color"
  transitions:
    - from: "*"
      to: required
      trigger: "required=true"
      visual_change: "Red asterisk appended"
    - from: "*"
      to: error
      trigger: "error=true"
      visual_change: "Text color changes to status.error"

variants:
  - name: default
    description: "text.primary, label typography"
  - name: required
    description: "Same as default with status.error asterisk"
  - name: optional
    description: "Same as default with text.secondary '(optional)' suffix"
  - name: error
    description: "status.error text color"

accessibility:
  role: "label"
  aria_attributes: []
  keyboard: []
  focus:
    tabindex: "-1"
    focus_visible: false
    trap: false
  screen_reader:
    label_source: "Children text content"
    announcements: []

responsive:
  - breakpoint: mobile
    behavior: "Full width, stacks above input"
  - breakpoint: desktop
    behavior: "Can be inline or stacked depending on form layout"

tokens:
  consumes:
    - "label.default.text"
    - "label.default.font_size"
    - "label.default.font_weight"
    - "label.required.indicator_color"
    - "label.error.text"
  inherits_from: null
```

### 3.2.10 Badge

```yaml
name: Badge
category: atom
description: "Small status indicator or count display."

props:
  - name: variant
    type: '"neutral" | "success" | "warning" | "error" | "info"'
    required: false
    default: "neutral"
    description: "Color variant"
  - name: children
    type: ReactNode
    required: true
    default: null
    description: "Badge content (text or number)"
  - name: size
    type: '"sm" | "md"'
    required: false
    default: "md"
    description: "sm=20px height, md=24px height"
  - name: dot
    type: boolean
    required: false
    default: false
    description: "Dot-only mode (no text, 8px circle)"
  - name: maxCount
    type: number | undefined
    required: false
    default: null
    description: "Maximum number to display (shows {max}+ when exceeded)"

states:
  initial: default
  states:
    - name: default
      description: "Displays content"
  transitions: []

variants:
  - name: neutral
    description: "surface.page bg, text.secondary text"
  - name: success
    description: "Tinted status.success bg, status.success text"
  - name: warning
    description: "Tinted status.warning bg, status.warning text"
  - name: error
    description: "Tinted status.error bg, status.error text"
  - name: info
    description: "Tinted status.info bg, status.info text"

accessibility:
  role: "status"
  aria_attributes:
    - attribute: "aria-label"
      source: "Computed from variant + content (e.g., 'Error: 5')"
      required: false
  keyboard: []
  focus:
    tabindex: "-1"
    focus_visible: false
    trap: false
  screen_reader:
    label_source: "Text content"
    announcements: []

responsive:
  - breakpoint: mobile
    behavior: "Same across all breakpoints"
  - breakpoint: desktop
    behavior: "Same across all breakpoints"

tokens:
  consumes:
    - "badge.{variant}.bg"
    - "badge.{variant}.text"
    - "badge.{variant}.border"
    - "badge.{variant}.radius"
    - "badge.{variant}.padding_x"
    - "badge.{variant}.font_size"
    - "badge.{variant}.height"
  inherits_from: null
```

### 3.2.11 Avatar

```yaml
name: Avatar
category: atom
description: "User or entity visual identifier showing image, initials, or fallback icon."

props:
  - name: src
    type: string | undefined
    required: false
    default: null
    description: "Image URL"
  - name: alt
    type: string
    required: true
    default: null
    description: "Alt text (always required for accessibility)"
  - name: name
    type: string | undefined
    required: false
    default: null
    description: "Name for generating initials fallback"
  - name: size
    type: '"sm" | "md" | "lg" | "xl"'
    required: false
    default: "md"
    description: "sm=24px, md=32px, lg=40px, xl=48px"
  - name: status
    type: '"online" | "offline" | "busy" | "away" | undefined'
    required: false
    default: null
    description: "Status dot overlay"

states:
  initial: loading
  states:
    - name: loading
      description: "Image loading, shows skeleton or initials"
    - name: image
      description: "Image loaded successfully"
    - name: initials
      description: "No image, shows 1-2 character initials"
    - name: fallback
      description: "No image, no name, shows generic icon"
  transitions:
    - from: loading
      to: image
      trigger: "Image loads successfully"
      visual_change: "Image fades in"
    - from: loading
      to: initials
      trigger: "Image fails, name provided"
      visual_change: "Initials displayed on colored background"
    - from: loading
      to: fallback
      trigger: "Image fails, no name"
      visual_change: "Generic user icon on neutral background"

variants:
  - name: image
    description: "Circular clipped image"
  - name: initials
    description: "interactive.primary bg, text.on-primary initials"
  - name: fallback
    description: "surface.page bg, generic user icon in text.secondary"

accessibility:
  role: "img"
  aria_attributes:
    - attribute: "alt"
      source: "alt prop (REQUIRED)"
      required: true
  keyboard: []
  focus:
    tabindex: "-1"
    focus_visible: false
    trap: false
  screen_reader:
    label_source: "alt prop"
    announcements: []

responsive:
  - breakpoint: mobile
    behavior: "Same across breakpoints"
  - breakpoint: desktop
    behavior: "Same across breakpoints"

tokens:
  consumes:
    - "avatar.image.radius"
    - "avatar.initials.bg"
    - "avatar.initials.text"
    - "avatar.fallback.bg"
    - "avatar.fallback.icon_color"
    - "avatar.{size}.dimension"
    - "avatar.{size}.font_size"
  inherits_from: null
```

### 3.2.12 Icon

```yaml
name: Icon
category: atom
description: "SVG icon from the icon set with standardized sizing."

props:
  - name: name
    type: IconName
    required: true
    default: null
    description: "Icon identifier from the icon set"
  - name: size
    type: '"sm" | "md" | "lg"'
    required: false
    default: "md"
    description: "sm=16px, md=20px, lg=24px"
  - name: color
    type: '"default" | "primary" | "secondary" | "disabled" | "inherit"'
    required: false
    default: "default"
    description: "Icon color (inherit uses parent text color)"
  - name: label
    type: string | undefined
    required: false
    default: null
    description: "Accessible label (if icon is meaningful, not decorative)"

states:
  initial: default
  states:
    - name: default
      description: "Standard display"
  transitions: []

variants:
  - name: default
    description: "text.primary color at specified size"
  - name: primary
    description: "interactive.primary color"
  - name: secondary
    description: "text.secondary color"
  - name: disabled
    description: "text.disabled color"

accessibility:
  role: "img"
  aria_attributes:
    - attribute: "aria-hidden"
      source: "true if label is not provided (decorative icon)"
      required: true
    - attribute: "aria-label"
      source: "label prop"
      required: false
  keyboard: []
  focus:
    tabindex: "-1"
    focus_visible: false
    trap: false
  screen_reader:
    label_source: "label prop, or hidden if decorative"
    announcements: []

responsive:
  - breakpoint: mobile
    behavior: "Same across breakpoints"
  - breakpoint: desktop
    behavior: "Same across breakpoints"

tokens:
  consumes:
    - "icon.default.color"
    - "icon.primary.color"
    - "icon.secondary.color"
    - "icon.disabled.color"
    - "icon.sm.dimension"
    - "icon.md.dimension"
    - "icon.lg.dimension"
  inherits_from: null
```

### 3.2.13 Tag

```yaml
name: Tag
category: atom
description: "Compact label for categorization, filtering, or selection."

props:
  - name: children
    type: ReactNode
    required: true
    default: null
    description: "Tag text"
  - name: variant
    type: '"default" | "selected" | "removable" | "disabled"'
    required: false
    default: "default"
    description: "Visual and behavior variant"
  - name: onRemove
    type: "() => void | undefined"
    required: false
    default: null
    description: "Remove handler (shows X button when present)"
  - name: onClick
    type: "() => void | undefined"
    required: false
    default: null
    description: "Click handler for selectable tags"

states:
  initial: default
  states:
    - name: default
      description: "Standard display"
    - name: hover
      description: "Cursor over (if interactive)"
    - name: selected
      description: "Active selection"
    - name: disabled
      description: "Non-interactive"
  transitions:
    - from: default
      to: hover
      trigger: "Mouse enter (if onClick or onRemove defined)"
      visual_change: "Slightly darker background"
    - from: default
      to: selected
      trigger: "Click (if onClick defined)"
      visual_change: "Background changes to primary tint"
    - from: selected
      to: default
      trigger: "Click again"
      visual_change: "Background returns to default"

variants:
  - name: default
    description: "surface.page bg, text.primary text, radius.pill, border.subtle border"
  - name: selected
    description: "interactive.primary tinted bg, interactive.primary text"
  - name: removable
    description: "Same as default with X icon button on right"
  - name: disabled
    description: "Reduced opacity, no interaction"

accessibility:
  role: "button (if interactive) or status (if display-only)"
  aria_attributes:
    - attribute: "aria-selected"
      source: "variant === 'selected'"
      required: false
    - attribute: "aria-disabled"
      source: "variant === 'disabled'"
      required: false
  keyboard:
    - key: "Enter / Space"
      action: "Toggle selection (if interactive)"
    - key: "Backspace / Delete"
      action: "Trigger onRemove (if removable)"
  focus:
    tabindex: "0 if interactive, -1 if display"
    focus_visible: true
    trap: false
  screen_reader:
    label_source: "Children text content"
    announcements:
      - "When removed: announces 'Removed {label}'"

responsive:
  - breakpoint: mobile
    behavior: "44px touch target for interactive tags"
  - breakpoint: desktop
    behavior: "Inline, compact"

tokens:
  consumes:
    - "tag.default.bg"
    - "tag.default.text"
    - "tag.default.border"
    - "tag.default.radius"
    - "tag.selected.bg"
    - "tag.selected.text"
    - "tag.disabled.opacity"
  inherits_from: null
```

### 3.2.14 Tooltip

```yaml
name: Tooltip
category: atom
description: "Contextual hint displayed on hover or focus."

props:
  - name: content
    type: ReactNode
    required: true
    default: null
    description: "Tooltip content"
  - name: children
    type: ReactNode
    required: true
    default: null
    description: "Trigger element"
  - name: position
    type: '"top" | "bottom" | "left" | "right"'
    required: false
    default: "top"
    description: "Preferred position (auto-flips if overflows viewport)"
  - name: delay
    type: number
    required: false
    default: 500
    description: "Delay in ms before showing"
  - name: maxWidth
    type: number
    required: false
    default: 256
    description: "Maximum width in pixels"

states:
  initial: hidden
  states:
    - name: hidden
      description: "Not visible"
    - name: visible
      description: "Shown near trigger element"
  transitions:
    - from: hidden
      to: visible
      trigger: "Mouse hover after delay, or focus on trigger"
      visual_change: "Tooltip fades in at specified position"
    - from: visible
      to: hidden
      trigger: "Mouse leave, focus lost, Escape key, or scroll"
      visual_change: "Tooltip fades out"

variants:
  - name: default
    description: "Dark bg (gray-900 in light mode, gray-100 in dark mode), contrasting text, radius.sm, shadow.tooltip"

accessibility:
  role: "tooltip"
  aria_attributes:
    - attribute: "aria-describedby"
      source: "ID of tooltip content element, set on trigger"
      required: true
  keyboard:
    - key: "Escape"
      action: "Dismiss tooltip"
  focus:
    tabindex: "-1"
    focus_visible: false
    trap: false
  screen_reader:
    label_source: "Content text"
    announcements:
      - "Tooltip content announced when trigger receives focus"

responsive:
  - breakpoint: mobile
    behavior: "Hidden by default (no hover on touch). Consider long-press trigger."
  - breakpoint: desktop
    behavior: "Shows on hover after delay"

tokens:
  consumes:
    - "tooltip.default.bg"
    - "tooltip.default.text"
    - "tooltip.default.radius"
    - "tooltip.default.padding"
    - "tooltip.default.shadow"
    - "tooltip.default.font_size"
    - "tooltip.default.max_width"
  inherits_from: null
```

### 3.2.15 Spinner

```yaml
name: Spinner
category: atom
description: "Loading indicator for indeterminate wait states."

props:
  - name: size
    type: '"sm" | "md" | "lg"'
    required: false
    default: "md"
    description: "sm=16px, md=24px, lg=32px"
  - name: label
    type: string
    required: false
    default: "Loading"
    description: "Accessible label"
  - name: color
    type: '"primary" | "inherit"'
    required: false
    default: "primary"
    description: "Spinner color"

states:
  initial: spinning
  states:
    - name: spinning
      description: "Continuously rotating"
  transitions: []

variants:
  - name: default
    description: "interactive.primary colored circular track with rotating segment"

accessibility:
  role: "progressbar"
  aria_attributes:
    - attribute: "aria-valuetext"
      source: "label prop"
      required: true
    - attribute: "aria-busy"
      source: "Always true"
      required: true
  keyboard: []
  focus:
    tabindex: "-1"
    focus_visible: false
    trap: false
  screen_reader:
    label_source: "label prop"
    announcements: []

responsive:
  - breakpoint: mobile
    behavior: "Same across breakpoints"
  - breakpoint: desktop
    behavior: "Same across breakpoints"

tokens:
  consumes:
    - "spinner.default.color"
    - "spinner.default.track_color"
    - "spinner.sm.dimension"
    - "spinner.md.dimension"
    - "spinner.lg.dimension"
  inherits_from: null
```

### 3.2.16 ProgressBar

```yaml
name: ProgressBar
category: atom
description: "Determinate or indeterminate progress indicator."

props:
  - name: value
    type: number | undefined
    required: false
    default: null
    description: "Progress 0-100 (undefined = indeterminate)"
  - name: variant
    type: '"default" | "success" | "error"'
    required: false
    default: "default"
    description: "Color variant"
  - name: label
    type: string | undefined
    required: false
    default: null
    description: "Visible label"
  - name: showValue
    type: boolean
    required: false
    default: false
    description: "Show percentage text"
  - name: size
    type: '"sm" | "md"'
    required: false
    default: "md"
    description: "Track height: sm=4px, md=8px"

states:
  initial: indeterminate
  states:
    - name: indeterminate
      description: "Animated sliding bar, no percentage"
    - name: determinate
      description: "Bar fills to value percentage"
    - name: complete
      description: "Bar fully filled (value=100)"
  transitions:
    - from: indeterminate
      to: determinate
      trigger: "value prop provided"
      visual_change: "Bar transitions from animation to filled"
    - from: determinate
      to: complete
      trigger: "value reaches 100"
      visual_change: "Bar fully filled, may change to success color"

variants:
  - name: default
    description: "interactive.primary fill on border.subtle track"
  - name: success
    description: "status.success fill"
  - name: error
    description: "status.error fill"

accessibility:
  role: "progressbar"
  aria_attributes:
    - attribute: "aria-valuenow"
      source: "value prop"
      required: true
    - attribute: "aria-valuemin"
      source: "Always 0"
      required: true
    - attribute: "aria-valuemax"
      source: "Always 100"
      required: true
    - attribute: "aria-label"
      source: "label prop"
      required: false
  keyboard: []
  focus:
    tabindex: "-1"
    focus_visible: false
    trap: false
  screen_reader:
    label_source: "label prop or associated heading"
    announcements:
      - "Percentage change announced at 25%, 50%, 75%, 100%"

responsive:
  - breakpoint: mobile
    behavior: "Full width of container"
  - breakpoint: desktop
    behavior: "Full width of container"

tokens:
  consumes:
    - "progress-bar.default.track_bg"
    - "progress-bar.default.fill_bg"
    - "progress-bar.success.fill_bg"
    - "progress-bar.error.fill_bg"
    - "progress-bar.default.radius"
    - "progress-bar.sm.height"
    - "progress-bar.md.height"
  inherits_from: null
```

### 3.2.17 Skeleton

```yaml
name: Skeleton
category: atom
description: "Placeholder loading shape that mimics content layout."

props:
  - name: variant
    type: '"text" | "circle" | "rect" | "custom"'
    required: false
    default: "text"
    description: "Shape: text (lines), circle, rectangle, or custom dimensions"
  - name: width
    type: string | number | undefined
    required: false
    default: "100%"
    description: "Width (CSS value or pixels)"
  - name: height
    type: string | number | undefined
    required: false
    default: null
    description: "Height (inferred from variant if not specified)"
  - name: lines
    type: number
    required: false
    default: 1
    description: "Number of text lines (variant=text only)"
  - name: animate
    type: boolean
    required: false
    default: true
    description: "Whether shimmer animation is active"

states:
  initial: loading
  states:
    - name: loading
      description: "Animated shimmer"
  transitions: []

variants:
  - name: text
    description: "Rounded rectangle, height matches body-default line height, last line 75% width"
  - name: circle
    description: "Circular, diameter = width = height"
  - name: rect
    description: "Rounded rectangle with specified dimensions"

accessibility:
  role: "presentation"
  aria_attributes:
    - attribute: "aria-hidden"
      source: "Always true"
      required: true
  keyboard: []
  focus:
    tabindex: "-1"
    focus_visible: false
    trap: false
  screen_reader:
    label_source: "Hidden from screen readers. Parent container should have aria-busy=true."
    announcements: []

responsive:
  - breakpoint: mobile
    behavior: "Fills container width"
  - breakpoint: desktop
    behavior: "Respects specified width"

tokens:
  consumes:
    - "skeleton.default.bg"
    - "skeleton.default.shimmer_color"
    - "skeleton.default.radius"
    - "skeleton.default.animation_duration"
  inherits_from: null
```

### 3.2.18 Divider

```yaml
name: Divider
category: atom
description: "Visual separator between content sections."

props:
  - name: orientation
    type: '"horizontal" | "vertical"'
    required: false
    default: "horizontal"
    description: "Direction"
  - name: label
    type: string | undefined
    required: false
    default: null
    description: "Optional text label centered on the divider"

states:
  initial: default
  states:
    - name: default
      description: "Static line"
  transitions: []

variants:
  - name: horizontal
    description: "1px height, full width, border.subtle color"
  - name: vertical
    description: "1px width, full height, border.subtle color"
  - name: with-label
    description: "Line interrupted by centered label text in text.secondary"

accessibility:
  role: "separator"
  aria_attributes:
    - attribute: "aria-orientation"
      source: "orientation prop"
      required: true
  keyboard: []
  focus:
    tabindex: "-1"
    focus_visible: false
    trap: false
  screen_reader:
    label_source: "label prop if provided"
    announcements: []

responsive:
  - breakpoint: mobile
    behavior: "Same across breakpoints"
  - breakpoint: desktop
    behavior: "Same across breakpoints"

tokens:
  consumes:
    - "divider.default.color"
    - "divider.default.thickness"
    - "divider.label.text_color"
    - "divider.label.font_size"
    - "divider.default.margin"
  inherits_from: null
```

### 3.2.19 Link

```yaml
name: Link
category: atom
description: "Navigation element for internal or external destinations."

props:
  - name: href
    type: string
    required: true
    default: null
    description: "Destination URL"
  - name: children
    type: ReactNode
    required: true
    default: null
    description: "Link text"
  - name: external
    type: boolean
    required: false
    default: false
    description: "Opens in new tab with external icon"
  - name: disabled
    type: boolean
    required: false
    default: false
    description: "Non-interactive"

states:
  initial: default
  states:
    - name: default
      description: "Interactive.primary text, underline optional"
    - name: hover
      description: "Underline appears/darkens"
    - name: visited
      description: "Slightly different hue (optional)"
    - name: focus
      description: "Focus ring"
    - name: disabled
      description: "text.disabled, no interaction"
  transitions:
    - from: default
      to: hover
      trigger: "Mouse enter"
      visual_change: "Underline appears"
    - from: hover
      to: default
      trigger: "Mouse leave"
      visual_change: "Underline removed"

variants:
  - name: default
    description: "interactive.primary text"
  - name: external
    description: "Same + trailing external-link icon"

accessibility:
  role: "link"
  aria_attributes:
    - attribute: "target"
      source: "'_blank' if external"
      required: false
    - attribute: "rel"
      source: "'noopener noreferrer' if external"
      required: true
  keyboard:
    - key: "Enter"
      action: "Navigate to href"
  focus:
    tabindex: "0"
    focus_visible: true
    trap: false
  screen_reader:
    label_source: "Children text content"
    announcements:
      - "External links: announces 'opens in new tab'"

responsive:
  - breakpoint: mobile
    behavior: "44px touch target height"
  - breakpoint: desktop
    behavior: "Inline"

tokens:
  consumes:
    - "link.default.text"
    - "link.hover.text"
    - "link.visited.text"
    - "link.disabled.text"
    - "link.focus.ring_color"
  inherits_from: null
```

### 3.2.20 Typography

```yaml
name: Typography
category: atom
description: "Text rendering component with semantic variants."

props:
  - name: variant
    type: '"display" | "h1" | "h2" | "h3" | "h4" | "body" | "body-sm" | "caption" | "code" | "label"'
    required: false
    default: "body"
    description: "Typography scale variant"
  - name: as
    type: '"h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div" | "label" | "code" | "pre"'
    required: false
    default: null
    description: "HTML element to render (auto-detected from variant if not specified)"
  - name: children
    type: ReactNode
    required: true
    default: null
    description: "Text content"
  - name: color
    type: '"primary" | "secondary" | "disabled" | "error" | "success" | "inherit"'
    required: false
    default: "primary"
    description: "Text color semantic"
  - name: truncate
    type: boolean
    required: false
    default: false
    description: "Truncate with ellipsis on overflow"
  - name: maxLines
    type: number | undefined
    required: false
    default: null
    description: "Maximum lines before truncation"
  - name: align
    type: '"left" | "center" | "right"'
    required: false
    default: "left"
    description: "Text alignment"

states:
  initial: default
  states:
    - name: default
      description: "Renders text with specified style"
  transitions: []

variants:
  - name: h1
    description: "typography.heading.h1 tokens"
  - name: h2
    description: "typography.heading.h2 tokens"
  - name: h3
    description: "typography.heading.h3 tokens"
  - name: h4
    description: "typography.heading.h4 tokens"
  - name: body
    description: "typography.body.default tokens"
  - name: body-sm
    description: "typography.body.small tokens"
  - name: caption
    description: "typography.caption tokens"
  - name: code
    description: "typography.code tokens (monospace)"
  - name: label
    description: "typography.label tokens"

accessibility:
  role: "none (semantic role from HTML element)"
  aria_attributes: []
  keyboard: []
  focus:
    tabindex: "-1"
    focus_visible: false
    trap: false
  screen_reader:
    label_source: "Text content; heading levels from HTML element"
    announcements: []

responsive:
  - breakpoint: mobile
    behavior: "Font size may scale down by 1 step for h1, h2 on mobile"
  - breakpoint: desktop
    behavior: "Full size scale"

tokens:
  consumes:
    - "Semantic typography tokens directly (no component token layer)"
  inherits_from: null
```

### 3.2.21 Image

```yaml
name: Image
category: atom
description: "Image display with loading, error, and lazy-loading states."

props:
  - name: src
    type: string
    required: true
    default: null
    description: "Image URL"
  - name: alt
    type: string
    required: true
    default: null
    description: "Alt text (REQUIRED)"
  - name: width
    type: number | string
    required: false
    default: null
    description: "Width"
  - name: height
    type: number | string
    required: false
    default: null
    description: "Height"
  - name: aspectRatio
    type: string | undefined
    required: false
    default: null
    description: "CSS aspect-ratio value (e.g., '16/9')"
  - name: lazy
    type: boolean
    required: false
    default: true
    description: "Enable lazy loading"
  - name: fallback
    type: ReactNode | undefined
    required: false
    default: null
    description: "Fallback content on error"

states:
  initial: loading
  states:
    - name: loading
      description: "Skeleton placeholder visible"
    - name: loaded
      description: "Image visible"
    - name: error
      description: "Failed to load, shows fallback or broken image indicator"
  transitions:
    - from: loading
      to: loaded
      trigger: "Image onLoad event"
      visual_change: "Image fades in, skeleton fades out"
    - from: loading
      to: error
      trigger: "Image onError event"
      visual_change: "Fallback content or error indicator shown"

variants:
  - name: default
    description: "Standard image with loading skeleton"

accessibility:
  role: "img"
  aria_attributes:
    - attribute: "alt"
      source: "alt prop (REQUIRED)"
      required: true
  keyboard: []
  focus:
    tabindex: "-1"
    focus_visible: false
    trap: false
  screen_reader:
    label_source: "alt prop"
    announcements: []

responsive:
  - breakpoint: mobile
    behavior: "Respects width/height constraints; lazy loading with intersection observer"
  - breakpoint: desktop
    behavior: "Same"

tokens:
  consumes:
    - "image.loading.bg"
    - "image.error.bg"
    - "image.error.icon_color"
    - "image.default.radius"
  inherits_from: null
```

### 3.2.22 VisuallyHidden

```yaml
name: VisuallyHidden
category: atom
description: "Content hidden visually but accessible to screen readers."

props:
  - name: children
    type: ReactNode
    required: true
    default: null
    description: "Content for screen readers"

states:
  initial: hidden
  states:
    - name: hidden
      description: "Visually hidden but present in accessibility tree"
  transitions: []

variants: []

accessibility:
  role: "none"
  aria_attributes: []
  keyboard: []
  focus:
    tabindex: "-1"
    focus_visible: false
    trap: false
  screen_reader:
    label_source: "Children content"
    announcements: []

responsive:
  - breakpoint: mobile
    behavior: "Always hidden visually"
  - breakpoint: desktop
    behavior: "Always hidden visually"

tokens:
  consumes: []
  inherits_from: null
```

### 3.2.23 Kbd

```yaml
name: Kbd
category: atom
description: "Keyboard shortcut display element."

props:
  - name: children
    type: ReactNode
    required: true
    default: null
    description: "Key label (e.g., 'Cmd', 'K', 'Enter')"

states:
  initial: default
  states:
    - name: default
      description: "Displays key"
  transitions: []

variants:
  - name: default
    description: "surface.page bg, border.default border, code typography, radius.sm, slight inset shadow"

accessibility:
  role: "none"
  aria_attributes: []
  keyboard: []
  focus:
    tabindex: "-1"
    focus_visible: false
    trap: false
  screen_reader:
    label_source: "Children text"
    announcements: []

responsive:
  - breakpoint: mobile
    behavior: "Same across breakpoints"
  - breakpoint: desktop
    behavior: "Same across breakpoints"

tokens:
  consumes:
    - "kbd.default.bg"
    - "kbd.default.text"
    - "kbd.default.border"
    - "kbd.default.radius"
    - "kbd.default.padding_x"
    - "kbd.default.padding_y"
    - "kbd.default.font_size"
    - "kbd.default.shadow"
  inherits_from: null
```

### 3.2.24 StatusDot

```yaml
name: StatusDot
category: atom
description: "Small colored dot indicating status."

props:
  - name: status
    type: '"success" | "warning" | "error" | "info" | "neutral"'
    required: true
    default: null
    description: "Status variant"
  - name: pulse
    type: boolean
    required: false
    default: false
    description: "Whether the dot pulses (for active/live states)"
  - name: label
    type: string | undefined
    required: false
    default: null
    description: "Accessible label"

states:
  initial: default
  states:
    - name: default
      description: "Static dot"
    - name: pulsing
      description: "Animated pulsing dot"
  transitions:
    - from: default
      to: pulsing
      trigger: "pulse=true"
      visual_change: "Dot gains pulsing animation"

variants:
  - name: success
    description: "status.success color"
  - name: warning
    description: "status.warning color"
  - name: error
    description: "status.error color"
  - name: info
    description: "status.info color"
  - name: neutral
    description: "text.disabled color"

accessibility:
  role: "status"
  aria_attributes:
    - attribute: "aria-label"
      source: "label prop or status name"
      required: true
  keyboard: []
  focus:
    tabindex: "-1"
    focus_visible: false
    trap: false
  screen_reader:
    label_source: "label prop"
    announcements: []

responsive:
  - breakpoint: mobile
    behavior: "8px dot"
  - breakpoint: desktop
    behavior: "8px dot"

tokens:
  consumes:
    - "status-dot.success.bg"
    - "status-dot.warning.bg"
    - "status-dot.error.bg"
    - "status-dot.info.bg"
    - "status-dot.neutral.bg"
    - "status-dot.default.dimension"
    - "status-dot.pulse.animation_duration"
  inherits_from: null
```

### 3.2.25 Separator

```yaml
name: Separator
category: atom
description: "Semantic separator between groups of content (named variant of Divider with semantic meaning)."

props:
  - name: orientation
    type: '"horizontal" | "vertical"'
    required: false
    default: "horizontal"
    description: "Direction"

states:
  initial: default
  states:
    - name: default
      description: "Static line"
  transitions: []

variants:
  - name: default
    description: "border.subtle, 1px thickness"

accessibility:
  role: "separator"
  aria_attributes:
    - attribute: "aria-orientation"
      source: "orientation prop"
      required: true
  keyboard: []
  focus:
    tabindex: "-1"
    focus_visible: false
    trap: false
  screen_reader:
    label_source: "Implicit separator"
    announcements: []

responsive:
  - breakpoint: mobile
    behavior: "Same across breakpoints"
  - breakpoint: desktop
    behavior: "Same across breakpoints"

tokens:
  consumes:
    - "separator.default.color"
    - "separator.default.thickness"
  inherits_from: "Divider"
```

---

## 3.3 Molecule Contracts

Due to the volume of 22 molecule contracts, each is specified with the same schema as atoms but presented in compact form. Every field from section 3.1.1 is present; the full YAML structure is the canonical form.

### 3.3.1 FormField

- **Composed of:** Label + TextInput (or Select, TextArea) + HelpText (Typography.caption) + ErrorText (Typography.caption, error color)
- **Props:** `label: string`, `helpText?: string`, `errorMessage?: string`, `required?: boolean`, `children: ReactNode` (the input element)
- **States:** `default -> error (when errorMessage is set) -> default (when cleared)`
- **Variants:** `default`, `error`, `disabled`
- **Accessibility:** role=group, aria-describedby pointing to help/error text IDs, error announced via aria-live
- **Responsive:** Stack layout on all breakpoints; label above input
- **Tokens:** `form-field.default.gap` (gap between label/input/text), `form-field.default.margin_bottom`

### 3.3.2 SearchBar

- **Composed of:** TextInput (type=search) + IconButton(search) + IconButton(clear)
- **Props:** `value: string`, `placeholder?: string`, `onSearch: (query: string) => void`, `debounce?: number` (default 300ms), `suggestions?: string[]`
- **States:** `empty -> typing (onChange) -> searching (debounce triggers) -> results (suggestions shown) -> empty (clear)`
- **Variants:** `default`, `expanded` (full-width on focus)
- **Accessibility:** role=search, aria-label, Escape clears and closes suggestions, ArrowDown moves to suggestions
- **Responsive:** Full width on mobile; configurable width on desktop
- **Tokens:** `search-bar.default.bg`, `search-bar.default.border`, `search-bar.default.radius`, `search-bar.default.height`

### 3.3.3 SelectField

- **Composed of:** Label + Select + HelpText + ErrorText
- **Props:** Same as FormField but wraps Select instead of TextInput
- **States:** Same as FormField
- **Variants:** `default`, `error`, `disabled`
- **Accessibility:** Same as FormField
- **Tokens:** `form-field.*` (shared with FormField)

### 3.3.4 DatePicker

- **Composed of:** TextInput (formatted date display) + Calendar popup (Grid of days)
- **Props:** `value?: Date`, `min?: Date`, `max?: Date`, `locale?: string`, `format?: string`, `onChange: (date: Date) => void`
- **States:** `closed -> open (click/Enter) -> day-selection (navigating calendar) -> closed (selection made)`
- **Variants:** `default`, `range` (two dates), `error`, `disabled`
- **Accessibility:** role=dialog for calendar, grid role for days, ArrowKeys navigate days, Enter selects, Escape closes
- **Responsive:** Mobile: full-screen or bottom sheet calendar. Desktop: floating dropdown calendar
- **Tokens:** `date-picker.calendar.bg`, `date-picker.calendar.shadow`, `date-picker.day.default.bg`, `date-picker.day.selected.bg`, `date-picker.day.today.border`

### 3.3.5 FileUpload

- **Composed of:** DropZone (div with dashed border) + ProgressBar + file list (ListItems)
- **Props:** `accept?: string`, `maxSize?: number` (bytes), `maxFiles?: number`, `multiple?: boolean`, `onUpload: (files: File[]) => void`
- **States:** `idle -> dragover (file dragged in) -> uploading (files dropped/selected) -> complete -> error`
- **Variants:** `default` (drag zone + button), `compact` (button only)
- **Accessibility:** role=button on trigger, aria-label describes accepted types, progress announced via aria-live
- **Responsive:** Full width on all breakpoints
- **Tokens:** `file-upload.zone.border`, `file-upload.zone.bg`, `file-upload.zone.border_active`, `file-upload.zone.radius`

### 3.3.6 NavItem

- **Composed of:** Icon + Label (Typography) + Badge (optional count)
- **Props:** `icon?: IconName`, `label: string`, `href: string`, `active?: boolean`, `badge?: number`, `collapsed?: boolean`, `children?: NavItem[]` (nested)
- **States:** `default -> hover -> active (current route) -> disabled`
- **Variants:** `default`, `active`, `collapsed` (icon only), `nested` (indented children)
- **Accessibility:** role=link or role=treeitem (if nested), aria-current=page when active
- **Responsive:** Full label on desktop; icon-only when sidebar is collapsed
- **Tokens:** `nav-item.default.text`, `nav-item.default.bg`, `nav-item.hover.bg`, `nav-item.active.bg`, `nav-item.active.text`, `nav-item.active.border_left`, `nav-item.default.padding`, `nav-item.default.gap`

### 3.3.7 Breadcrumb

- **Composed of:** Link (repeated) + Separator (/ or >)
- **Props:** `items: { label: string; href: string }[]`, `separator?: ReactNode` (default "/")
- **States:** Single static state; last item is non-interactive current page
- **Variants:** `default`
- **Accessibility:** role=navigation, aria-label="Breadcrumb", last item aria-current=page
- **Responsive:** Mobile: collapse middle items to "..." with dropdown. Desktop: full breadcrumb trail
- **Tokens:** `breadcrumb.default.gap`, `breadcrumb.separator.color`, `breadcrumb.current.text`

### 3.3.8 Pagination

- **Composed of:** Button (repeated page numbers) + IconButton(prev) + IconButton(next) + Select(page size, optional)
- **Props:** `totalItems: number`, `pageSize: number`, `currentPage: number`, `onPageChange: (page: number) => void`, `pageSizeOptions?: number[]`
- **States:** `default (navigable) -> loading (page transition)`
- **Variants:** `default`, `compact` (prev/next + current page only)
- **Accessibility:** role=navigation, aria-label="Pagination", current page aria-current=page
- **Responsive:** Mobile: compact variant. Desktop: full page numbers
- **Tokens:** `pagination.default.gap`, `pagination.page.height`, `pagination.page.min_width`

### 3.3.9 Tab

- **Composed of:** Button (repeated, styled as tabs) + content area (slot)
- **Props:** `tabs: { key: string; label: string; icon?: IconName; disabled?: boolean }[]`, `activeKey: string`, `onChange: (key: string) => void`, `lazy?: boolean`
- **States:** Each tab: `default -> hover -> active (selected) -> disabled`
- **Variants:** `default` (underline indicator), `pills` (filled indicator), `vertical`
- **Accessibility:** role=tablist on container, role=tab on each tab, role=tabpanel on content. ArrowLeft/ArrowRight to navigate, Enter/Space to activate, Home/End
- **Responsive:** Mobile: horizontal scroll with overflow indicator, or switch to accordion. Desktop: full tab bar
- **Tokens:** `tab.default.text`, `tab.active.text`, `tab.active.indicator_color`, `tab.active.indicator_height`, `tab.hover.bg`, `tab.disabled.text`

### 3.3.10 AlertBanner

- **Composed of:** Icon + Typography (message) + Button (action, optional) + IconButton(close, optional)
- **Props:** `variant: "info" | "success" | "warning" | "error"`, `children: ReactNode`, `action?: { label: string; onClick: () => void }`, `dismissible?: boolean`, `onDismiss?: () => void`
- **States:** `visible -> dismissed (fade out)`
- **Variants:** `info` (info icon, info-tinted bg), `success`, `warning`, `error`
- **Accessibility:** role=alert (for error/warning) or role=status (for info/success), aria-live=polite
- **Responsive:** Full width; action button stacks below message on mobile
- **Tokens:** `alert-banner.{variant}.bg`, `alert-banner.{variant}.border`, `alert-banner.{variant}.text`, `alert-banner.{variant}.icon_color`, `alert-banner.default.padding`, `alert-banner.default.radius`

### 3.3.11 Toast

- **Composed of:** Icon + Typography (message) + Button (action, optional) + Timer (auto-dismiss) + close button
- **Props:** `variant: "info" | "success" | "warning" | "error"`, `message: string`, `action?: { label: string; onClick: () => void }`, `duration?: number` (0 = no auto-dismiss), `onDismiss: () => void`
- **States:** `entering (slide in) -> visible -> exiting (slide out) -> dismissed`
- **Variants:** `info` (5000ms auto-dismiss), `success` (3000ms), `warning` (8000ms), `error` (no auto-dismiss)
- **Accessibility:** role=alert, aria-live=assertive for error, aria-live=polite for others. Auto-dismiss includes undo action.
- **Responsive:** Mobile: full width, bottom-center of screen. Desktop: fixed position, bottom-right
- **Tokens:** `toast.{variant}.bg`, `toast.{variant}.border`, `toast.{variant}.text`, `toast.{variant}.shadow`, `toast.default.radius`, `toast.default.padding`, `toast.default.max_width`
- **Stacking rules:**
  - Maximum 3 toasts visible simultaneously
  - Stacking order: LIFO (newest on bottom, pushing older toasts up)
  - When a 4th toast arrives while 3 are visible, the oldest toast is immediately dismissed
  - Position: bottom-right on desktop/wide, bottom-center on mobile/tablet
  - Z-index: `toast` tier (300) per Layer primitive z-index table
  - Animation: new toast slides in from bottom; dismissed toast fades out; remaining toasts shift position with `motion.interaction.content` duration
  - Spacing between stacked toasts: `spacing.component.gap-tight` (8px)

### 3.3.12 EmptyState

- **Composed of:** Icon or Illustration + Typography (title) + Typography (description) + Button (action)
- **Props:** `icon?: IconName`, `illustration?: ReactNode`, `title: string`, `description?: string`, `action?: { label: string; onClick: () => void }`
- **States:** Single static state
- **Variants:** `default`, `compact` (smaller, inline)
- **Accessibility:** No special role; text is the primary content
- **Responsive:** Centered in container, padding scales with breakpoint
- **Tokens:** `empty-state.default.padding`, `empty-state.icon.color`, `empty-state.icon.size`, `empty-state.title.font_size`

### 3.3.13 MetricCard

- **Composed of:** Label (Typography.caption) + Value (Typography.h2) + Trend indicator (up/down arrow + percentage) + Sparkline (optional)
- **Props:** `label: string`, `value: string | number`, `trend?: { direction: "up" | "down" | "flat"; value: string }`, `sparkline?: number[]`, `loading?: boolean`
- **States:** `loading (skeleton) -> loaded (shows data)`
- **Variants:** `default`, `compact`
- **Accessibility:** role=group, aria-label combines label + value + trend
- **Responsive:** Same across breakpoints (contained by grid)
- **Tokens:** `metric-card.default.bg`, `metric-card.default.border`, `metric-card.default.radius`, `metric-card.default.padding`, `metric-card.value.font_size`, `metric-card.trend.up_color`, `metric-card.trend.down_color`

### 3.3.14 UserCard

- **Composed of:** Avatar + Typography (name) + Typography (role/subtitle) + StatusDot
- **Props:** `name: string`, `subtitle?: string`, `avatarSrc?: string`, `status?: "online" | "offline" | "busy" | "away"`, `onClick?: () => void`
- **States:** `default -> hover (if onClick) -> active`
- **Variants:** `default`, `compact` (inline, smaller)
- **Accessibility:** role=button if interactive, role=group if display only
- **Responsive:** Same across breakpoints
- **Tokens:** `user-card.default.bg`, `user-card.default.border`, `user-card.default.radius`, `user-card.default.padding`, `user-card.default.gap`

### 3.3.15 ListItem

- **Composed of:** Leading element (Icon, Avatar, or Checkbox) + Content (title + subtitle) + Trailing element (Badge, StatusDot, or action buttons)
- **Props:** `leading?: ReactNode`, `title: string`, `subtitle?: string`, `trailing?: ReactNode`, `selected?: boolean`, `disabled?: boolean`, `onClick?: () => void`
- **States:** `default -> hover -> selected -> disabled`
- **Variants:** `default`, `selectable`, `with-actions` (actions visible on hover)
- **Accessibility:** role=listitem (within a list), aria-selected if selectable
- **Responsive:** Mobile: swipe actions. Desktop: hover-reveal actions
- **Tokens:** `list-item.default.bg`, `list-item.hover.bg`, `list-item.selected.bg`, `list-item.default.padding`, `list-item.default.border_bottom`, `list-item.default.min_height`

### 3.3.16 MenuItem

- **Composed of:** Icon (optional) + Label (Typography) + Shortcut (Kbd, optional) + Chevron (if has submenu)
- **Props:** `label: string`, `icon?: IconName`, `shortcut?: string`, `disabled?: boolean`, `onClick?: () => void`, `children?: MenuItem[]` (submenu)
- **States:** `default -> hover (highlighted) -> active (submenu open) -> disabled`
- **Variants:** `default`, `destructive` (red text), `separator` (renders a Divider instead of an item)
- **Accessibility:** role=menuitem, aria-haspopup if has submenu, aria-disabled. ArrowUp/ArrowDown navigates, ArrowRight opens submenu, ArrowLeft closes submenu
- **Responsive:** Same across breakpoints (always in floating context)
- **Tokens:** `menu-item.default.bg`, `menu-item.hover.bg`, `menu-item.default.text`, `menu-item.hover.text`, `menu-item.default.padding`, `menu-item.default.gap`, `menu-item.default.height`

### 3.3.17 DropdownMenu

- **Composed of:** Trigger (Button or IconButton) + Menu container (floating) + MenuItems (repeated)
- **Props:** `trigger: ReactNode`, `items: MenuItem[]`, `align?: "start" | "center" | "end"`, `side?: "top" | "bottom"`, `onSelect?: (item: MenuItem) => void`
- **States:** `closed -> open (click trigger) -> navigating (keyboard) -> closed (selection or escape)`
- **Variants:** `default`
- **Accessibility:** role=menu on container, trigger aria-haspopup=menu, aria-expanded. Full keyboard navigation as per MenuItem.
- **Responsive:** Mobile: may render as bottom sheet. Desktop: floating dropdown
- **Tokens:** `dropdown-menu.default.bg`, `dropdown-menu.default.border`, `dropdown-menu.default.radius`, `dropdown-menu.default.shadow`, `dropdown-menu.default.padding`, `dropdown-menu.default.min_width`, `dropdown-menu.default.max_height`

### 3.3.18 Popover

- **Composed of:** Trigger + Content panel (floating)
- **Props:** `trigger: ReactNode`, `children: ReactNode`, `open?: boolean`, `onOpenChange?: (open: boolean) => void`, `side?: "top" | "bottom" | "left" | "right"`, `align?: "start" | "center" | "end"`
- **States:** `closed -> open (click) -> closed (click outside, Escape, or explicit close)`
- **Variants:** `default`
- **Accessibility:** aria-haspopup=dialog on trigger, aria-expanded. Focus moves to first focusable element in content. Escape closes.
- **Responsive:** Mobile: may render as bottom sheet. Desktop: floating panel
- **Tokens:** `popover.default.bg`, `popover.default.border`, `popover.default.radius`, `popover.default.shadow`, `popover.default.padding`, `popover.default.max_width`

### 3.3.19 DialogActions

- **Composed of:** Button (cancel, secondary variant) + Button (confirm, primary or destructive variant)
- **Props:** `cancelLabel?: string` (default "Cancel"), `confirmLabel: string`, `confirmVariant?: "primary" | "destructive"` (default "primary"), `onCancel: () => void`, `onConfirm: () => void`, `loading?: boolean`
- **States:** `default -> confirming (loading=true)`
- **Variants:** `default`, `destructive` (confirm button uses destructive variant)
- **Accessibility:** Confirm button is the default action (autofocus when dialog opens). Cancel first in DOM order for RTL consistency.
- **Responsive:** Mobile: full-width stacked buttons (confirm on top). Desktop: inline buttons right-aligned
- **Tokens:** `dialog-actions.default.padding`, `dialog-actions.default.gap`, `dialog-actions.default.border_top`

### 3.3.20 TagInput

- **Composed of:** TextInput + Tag (repeated, displayed inline)
- **Props:** `value: string[]`, `onChange: (value: string[]) => void`, `placeholder?: string`, `maxTags?: number`, `suggestions?: string[]`, `allowCustom?: boolean`
- **States:** `default -> typing (text entered) -> suggesting (matches found) -> tag-added (Enter) -> tag-removed (Backspace on empty input)`
- **Variants:** `default`, `error`, `disabled`
- **Accessibility:** role=listbox for tag list, each tag is removable with Backspace/Delete
- **Responsive:** Same across breakpoints; tags wrap
- **Tokens:** `tag-input.*` (uses tag + text-input tokens)

### 3.3.21 ToggleGroup

- **Composed of:** Toggle segments (Button-like elements in a row)
- **Props:** `options: { value: string; label: string; icon?: IconName }[]`, `value: string | string[]`, `onChange: (value: string | string[]) => void`, `multiple?: boolean`
- **States:** Each segment: `default -> hover -> selected -> disabled`
- **Variants:** `default` (outlined segments), `pill` (rounded ends)
- **Accessibility:** role=radiogroup (single) or role=group (multiple), each segment role=radio or role=checkbox
- **Responsive:** Same across breakpoints
- **Tokens:** `toggle-group.default.bg`, `toggle-group.default.border`, `toggle-group.default.radius`, `toggle-group.segment.selected.bg`, `toggle-group.segment.selected.text`

### 3.3.22 StepIndicator

- **Composed of:** Step circles (numbered or icon) + Connectors (lines between steps)
- **Props:** `steps: { label: string; description?: string }[]`, `currentStep: number`, `orientation?: "horizontal" | "vertical"`, `clickable?: boolean`
- **States:** Each step: `completed (checkmark) -> current (highlighted) -> upcoming (dimmed)`
- **Variants:** `default` (numbered), `icon` (checkmark for completed)
- **Accessibility:** role=list, each step role=listitem with aria-current=step for current
- **Responsive:** Mobile: vertical orientation. Desktop: horizontal or vertical
- **Tokens:** `step-indicator.completed.bg`, `step-indicator.completed.text`, `step-indicator.current.bg`, `step-indicator.current.text`, `step-indicator.current.border`, `step-indicator.upcoming.bg`, `step-indicator.upcoming.text`, `step-indicator.connector.color`, `step-indicator.connector.width`, `step-indicator.step.dimension`

---

## 3.4 Organism Contracts

Organisms are the largest pre-built units. Each organism composes molecules and atoms into a recognizable UI section.

### 3.4.1 AppHeader

- **Composed of:** Logo (Image) + NavItems (horizontal) + SearchBar + Avatar + DropdownMenu (user menu)
- **Props:** `logo: ReactNode`, `navItems?: NavItem[]`, `searchEnabled?: boolean`, `user?: { name: string; avatar?: string }`, `actions?: ReactNode`
- **States:** `default -> search-expanded (mobile search opens) -> menu-open (user menu)`
- **Accessibility:** role=banner with aria-label="Site header", nav role=navigation for nav items
- **Responsive:** Mobile: hamburger menu replaces nav items; search opens as overlay. Desktop: full nav bar
- **Tokens:** `app-header.default.bg`, `app-header.default.shadow`, `app-header.default.height` (56px mobile, 64px desktop), `app-header.default.padding_x`

### 3.4.2 Sidebar

- **Composed of:** NavItems (grouped, vertical) + Collapse toggle (IconButton)
- **Props:** `items: NavItemGroup[]`, `collapsed?: boolean`, `onCollapse?: (collapsed: boolean) => void`, `footer?: ReactNode`
- **States:** `expanded (240px) -> collapsed (60px, icon-only) -> mobile-hidden -> mobile-overlay`
- **Accessibility:** role=navigation, aria-label="Main navigation". Collapse button aria-expanded.
- **Responsive:** Mobile: overlay drawer with backdrop. Tablet: collapsed rail (60px). Desktop: full (240px). Wide: full (280px)
- **Tokens:** `sidebar.default.bg`, `sidebar.default.border_right`, `sidebar.expanded.width` (240px), `sidebar.collapsed.width` (60px), `sidebar.default.padding`

### 3.4.3 DataTable

- **Composed of:** Column headers (sortable) + Rows + Checkbox (row selection) + Pagination + Toolbar (bulk actions) + FilterPanel (optional)
- **Props:** `columns: ColumnDef[]`, `data: T[]`, `loading?: boolean`, `selectable?: boolean`, `sortable?: boolean`, `pagination?: PaginationConfig`, `onRowClick?: (row: T) => void`, `bulkActions?: BulkAction[]`, `emptyState?: ReactNode`, `virtualScroll?: boolean`
- **States:** `loading (skeleton rows) -> loaded (data displayed) -> empty (no data) -> error (fetch failed) -> selecting (rows checked) -> sorting (column sorted) -> filtering (filter applied)`
- **Accessibility:** role=table, th role=columnheader with aria-sort, td role=cell, row checkboxes aria-label include row identifier
- **Responsive:** Mobile: card layout (each row becomes a card) or horizontal scroll. Desktop: full table layout
- **Tokens:** `data-table.header.bg`, `data-table.header.text`, `data-table.header.border`, `data-table.row.bg`, `data-table.row.hover_bg`, `data-table.row.selected_bg`, `data-table.row.border`, `data-table.cell.padding`, `data-table.default.radius`

### 3.4.4 Form

- **Composed of:** FormFields (repeated) + DialogActions (submit/cancel)
- **Props:** `onSubmit: (values: Record<string, any>) => void`, `onReset?: () => void`, `initialValues?: Record<string, any>`, `validation?: ValidationSchema`, `children: ReactNode` (FormField elements)
- **States:** `pristine (no changes) -> dirty (values changed) -> validating (on submit) -> submitting (async) -> submitted (success) -> error (validation or server error)`
- **Accessibility:** role=form, aria-label. Validation errors announced via aria-live. Focus moves to first error field on submit failure.
- **Responsive:** Single column on mobile. Can be multi-column on desktop.
- **Tokens:** `form.default.padding`, `form.default.gap` (between fields)

### 3.4.5 Modal

- **Composed of:** Overlay (semi-transparent backdrop) + Dialog container (Header + Body + DialogActions)
- **Props:** `open: boolean`, `onClose: () => void`, `title: string`, `description?: string`, `children: ReactNode`, `size?: "sm" | "md" | "lg" | "xl" | "full"`, `closable?: boolean` (default true)
- **States:** `closed -> opening (animation) -> open -> closing (animation) -> closed`
- **Accessibility:** role=dialog, aria-modal=true, aria-labelledby (title), aria-describedby (description). Focus trapped inside. Escape closes. Focus returns to trigger on close.
- **Responsive:** Mobile: full-screen (size="full" on mobile). Desktop: centered with max-width from size prop
- **Tokens:** `modal.overlay.bg` (rgba black with 0.5 opacity), `modal.dialog.bg`, `modal.dialog.radius`, `modal.dialog.shadow`, `modal.dialog.padding`, `modal.dialog.max_width` (per size: sm=400px, md=560px, lg=720px, xl=960px, full=100vw)

### 3.4.6 CommandPalette

- **Composed of:** SearchBar + MenuItem list (filtered) + keyboard shortcut display (Kbd)
- **Props:** `commands: Command[]`, `onSelect: (command: Command) => void`, `placeholder?: string`, `recentCommands?: Command[]`
- **States:** `closed -> open (Cmd+K) -> searching (typing) -> navigating (ArrowUp/Down) -> selected (Enter) -> closed`
- **Accessibility:** role=dialog with role=combobox inside. ArrowUp/Down navigates, Enter selects, Escape closes.
- **Responsive:** Mobile: full-width with reduced padding. Desktop: centered, max-width 640px
- **Tokens:** `command-palette.default.bg`, `command-palette.default.border`, `command-palette.default.radius`, `command-palette.default.shadow`, `command-palette.default.max_width`, `command-palette.default.max_height`

### 3.4.7 SlideOver

- **Composed of:** Overlay (same as Modal) + Side panel (slides from right)
- **Props:** `open: boolean`, `onClose: () => void`, `title: string`, `children: ReactNode`, `side?: "left" | "right"` (default right), `width?: "sm" | "md" | "lg"` (sm=320px, md=480px, lg=640px)
- **States:** `closed -> opening (slide animation) -> open -> closing (slide out) -> closed`
- **Accessibility:** Same as Modal (role=dialog, focus trap, Escape closes)
- **Responsive:** Mobile: full-width. Desktop: side panel with specified width
- **Tokens:** `slide-over.overlay.bg`, `slide-over.panel.bg`, `slide-over.panel.shadow`, `slide-over.panel.width` (per size), `slide-over.panel.padding`

### 3.4.8 FilterPanel

- **Composed of:** FormFields (various) + Button (Apply) + Button (Reset)
- **Props:** `filters: FilterDef[]`, `values: Record<string, any>`, `onApply: (values: Record<string, any>) => void`, `onReset: () => void`, `collapsible?: boolean`
- **States:** `expanded -> collapsed (if collapsible)`
- **Accessibility:** role=form, aria-label="Filters"
- **Responsive:** Mobile: opens as SlideOver or Modal. Desktop: inline panel
- **Tokens:** `filter-panel.default.bg`, `filter-panel.default.border`, `filter-panel.default.radius`, `filter-panel.default.padding`

### 3.4.9 CardGrid

- **Composed of:** Cards (repeated) + Pagination (optional) + EmptyState (when no items)
- **Props:** `children: ReactNode[]`, `columns?: ResponsiveValue<number>` (default { mobile: 1, tablet: 2, desktop: 3, wide: 4 }), `gap?: number`
- **States:** `loading (skeleton cards) -> loaded -> empty`
- **Accessibility:** role=list, each card role=listitem
- **Responsive:** Column count changes per breakpoint
- **Tokens:** `card-grid.default.gap` (per breakpoint)

### 3.4.10 ListView

- **Composed of:** ListItems (repeated) + Pagination + EmptyState
- **Props:** `items: T[]`, `renderItem: (item: T) => ReactNode`, `loading?: boolean`, `selectable?: boolean`, `virtualScroll?: boolean` (for 1000+ items)
- **States:** `loading -> loaded -> empty -> error`
- **Accessibility:** role=list, listitem for each item
- **Responsive:** Same across breakpoints (full width)
- **Tokens:** `list-view.default.gap`

### 3.4.11 Toolbar

- **Composed of:** Buttons + Selects + Dividers (vertical) + view toggles
- **Props:** `children: ReactNode`, `sticky?: boolean`
- **States:** Single static state
- **Accessibility:** role=toolbar, ArrowLeft/ArrowRight to navigate between items
- **Responsive:** Mobile: overflow items collapse into DropdownMenu. Desktop: full bar
- **Tokens:** `toolbar.default.bg`, `toolbar.default.border_bottom`, `toolbar.default.padding`, `toolbar.default.gap`, `toolbar.default.height`

### 3.4.12 StatsRow

- **Composed of:** MetricCards (repeated)
- **Props:** `metrics: MetricDef[]`, `loading?: boolean`, `columns?: ResponsiveValue<number>` (default { mobile: 1, tablet: 2, desktop: 4 })
- **States:** `loading -> loaded`
- **Accessibility:** role=group, aria-label="Key metrics"
- **Responsive:** Columns per breakpoint
- **Tokens:** `stats-row.default.gap`

### 3.4.13 FormWizard

- **Composed of:** StepIndicator + Form (per step) + navigation buttons (Back + Next/Submit)
- **Props:** `steps: WizardStep[]`, `onSubmit: (values: Record<string, any>) => void`, `onStepChange?: (step: number) => void`
- **States:** `step-N (current step) -> validating (Next pressed) -> step-N+1 (if valid) -> submitting (final step) -> complete`
- **Accessibility:** aria-label="Step N of M", step validation errors announced via aria-live. Focus moves to first error or first field of next step.
- **Responsive:** StepIndicator goes vertical on mobile. Full width form.
- **Tokens:** `form-wizard.default.padding`, `form-wizard.navigation.gap`, `form-wizard.step.gap`

### 3.4.14 NotificationCenter

- **Composed of:** List of notification items + "Mark all read" action + infinite scroll or pagination
- **Props:** `notifications: Notification[]`, `onMarkRead: (id: string) => void`, `onMarkAllRead: () => void`, `onDismiss: (id: string) => void`
- **States:** `loading -> loaded -> empty`
- **Accessibility:** role=feed, aria-label="Notifications", aria-live=polite for new items
- **Responsive:** Mobile: full screen. Desktop: dropdown panel (max 480px width)
- **Tokens:** `notification-center.default.bg`, `notification-center.default.border`, `notification-center.default.radius`, `notification-center.default.shadow`, `notification-center.default.max_height`, `notification-center.item.padding`, `notification-center.item.border_bottom`

### 3.4.15 SettingsSection

- **Composed of:** Typography (heading) + Typography (description) + FormFields or Toggles
- **Props:** `title: string`, `description?: string`, `children: ReactNode`
- **States:** Single static state
- **Accessibility:** role=group, aria-labelledby (heading ID)
- **Responsive:** Same across breakpoints
- **Tokens:** `settings-section.default.padding`, `settings-section.default.border_bottom`, `settings-section.heading.font_size`

**AI Organisms (3.4.16-3.4.22)**: The following 7 organisms are AI-specific. They are contractually organisms (composed from atoms and molecules, managed by the AI Chat Engine) but are physically located in the `ai/` directory in the repo architecture (Spec 08) to separate domain-specific code from generic UI organisms.

### 3.4.16 ChatMessage (AI-specific)

- **Composed of:** Avatar + message bubble + citations (expandable) + action buttons + branch indicator
- **Props:** `role: "user" | "assistant"`, `content: ReactNode`, `citations?: Citation[]`, `actions?: Action[]`, `timestamp?: Date`, `streaming?: boolean`, `branchId?: string`
- **States:** `streaming (content appearing word by word) -> complete -> expanded-citations`
- **Accessibility:** role=article, aria-label combines role + timestamp. Citations expandable via aria-expanded.
- **Responsive:** Same across breakpoints; max-width 80% of container
- **Tokens:** `chat-message.user.bg`, `chat-message.user.text`, `chat-message.user.radius`, `chat-message.assistant.bg`, `chat-message.assistant.text`, `chat-message.assistant.radius`, `chat-message.default.padding`, `chat-message.default.max_width`

### 3.4.17 ChatInput (AI-specific)

- **Composed of:** TextArea (auto-grow) + attachment button (IconButton) + source selector (Select) + send button (IconButton)
- **Props:** `value: string`, `onChange: (value: string) => void`, `onSend: () => void`, `onAttach?: (files: File[]) => void`, `sources?: { label: string; value: string }[]`, `placeholder?: string`, `disabled?: boolean`
- **States:** `empty -> typing -> ready-to-send (non-empty) -> sending (disabled during send)`
- **Accessibility:** role=textbox, aria-label="Message input", Cmd/Ctrl+Enter to send
- **Responsive:** Full width; attachment/source buttons may collapse into menu on mobile
- **Tokens:** `chat-input.default.bg`, `chat-input.default.border`, `chat-input.default.radius`, `chat-input.default.padding`, `chat-input.default.min_height`

### 3.4.18 StreamOfThought (AI-specific)

- **Composed of:** Step list where each step has: Icon (status) + Label + duration
- **Props:** `steps: { id: string; label: string; status: "queued" | "running" | "done" | "error"; duration?: number }[]`
- **States:** Each step transitions: `queued -> running -> done | error`
- **Accessibility:** role=list, each step role=listitem, aria-live=polite for status changes
- **Responsive:** Same across breakpoints
- **Tokens:** `stream-of-thought.default.gap`, `stream-of-thought.step.icon_size`, `stream-of-thought.queued.color`, `stream-of-thought.running.color`, `stream-of-thought.done.color`, `stream-of-thought.error.color`

### 3.4.19 ActionPlan (AI-specific)

- **Composed of:** Numbered steps, each with: description + approve/modify/reject buttons
- **Props:** `steps: { id: string; description: string; status: "pending" | "approved" | "modified" | "rejected" }[]`, `onApprove: (id: string) => void`, `onModify: (id: string) => void`, `onReject: (id: string) => void`, `onApproveAll?: () => void`
- **States:** Each step: `pending -> approved | modified | rejected`
- **Accessibility:** role=list, each step with action buttons. aria-live=polite for status changes.
- **Responsive:** Same across breakpoints
- **Tokens:** `action-plan.default.padding`, `action-plan.default.border`, `action-plan.default.radius`, `action-plan.step.padding`, `action-plan.pending.bg`, `action-plan.approved.bg`, `action-plan.rejected.bg`

### 3.4.20 CitationPanel (AI-specific)

- **Composed of:** Expandable list of citations, each with: source name + confidence Badge + preview text
- **Props:** `citations: { id: string; source: string; text: string; confidence: "high" | "medium" | "low"; url?: string }[]`, `expanded?: boolean`, `onToggle?: () => void`
- **States:** `collapsed (header only) -> expanded (full list)`
- **Accessibility:** aria-expanded on toggle button. role=list for citations.
- **Responsive:** Same across breakpoints
- **Tokens:** `citation-panel.default.bg`, `citation-panel.default.border`, `citation-panel.default.radius`, `citation-panel.default.padding`, `citation-panel.citation.bg`, `citation-panel.citation.border_left`, `citation-panel.citation.padding`

### 3.4.21 ConversationSidebar (AI-specific)

- **Composed of:** Thread list (ListItems with conversation title + timestamp) + search + branch indicators + pin indicators
- **Props:** `threads: Thread[]`, `activeThreadId?: string`, `onSelect: (id: string) => void`, `onSearch?: (query: string) => void`, `onPin?: (id: string) => void`, `onDelete?: (id: string) => void`
- **States:** `loaded -> searching -> empty-search-results`
- **Accessibility:** role=navigation, aria-label="Conversations". Each thread is selectable. aria-current for active.
- **Responsive:** Mobile: overlay drawer. Desktop: fixed sidebar
- **Tokens:** `conversation-sidebar.default.bg`, `conversation-sidebar.default.border_right`, `conversation-sidebar.default.width`, `conversation-sidebar.thread.padding`, `conversation-sidebar.thread.hover_bg`, `conversation-sidebar.thread.active_bg`

### 3.4.22 SuggestionChips (AI-specific)

- **Composed of:** Tag/Chip elements arranged in a grid or inline row
- **Props:** `suggestions: { label: string; icon?: IconName; onClick: () => void }[]`, `layout?: "inline" | "grid"`, `maxVisible?: number`
- **States:** `visible -> one-selected (others may fade) -> hidden (after selection)`
- **Accessibility:** role=group, aria-label="Suggestions". Each chip is a button.
- **Responsive:** Mobile: horizontal scroll. Desktop: wrap or grid
- **Tokens:** `suggestion-chips.chip.bg`, `suggestion-chips.chip.border`, `suggestion-chips.chip.radius`, `suggestion-chips.chip.padding`, `suggestion-chips.chip.text`, `suggestion-chips.chip.hover_bg`, `suggestion-chips.default.gap`

---

## 3.5 Cross-Component Rules

### 3.5.1 Composition Rules

Components may contain other components according to these rules:

| Container | Permitted Children |
|-----------|-------------------|
| Atoms | No component children (atoms are leaf nodes, except children prop which is ReactNode/text) |
| Molecules | Atoms only (plus ReactNode slots for custom content) |
| Organisms | Atoms + Molecules (plus ReactNode slots) |
| Templates | Organisms + Molecules + Atoms (full composition) |

Prohibited compositions:
- An Atom MUST NOT contain another Atom as a structural child (an Atom's `children` prop renders content, not nested Atoms)
- A Molecule MUST NOT contain an Organism
- An Organism MUST NOT contain another Organism as a direct structural child (it MAY contain Organisms in ReactNode slots where the consumer controls composition)

Exception: Layout primitives (VStack, Row, Grid, Split, Layer, Scroll) are not categorized as atoms/molecules/organisms and can contain any component at any level.

### 3.5.2 Event Propagation

- Click events on interactive children MUST call `event.stopPropagation()` to prevent triggering parent click handlers. Example: clicking a delete button inside a ListItem MUST NOT trigger the ListItem's onClick.
- Focus events MUST bubble naturally (no stopPropagation on focus/blur) to support focus-within styling
- Custom events (onChange, onSelect, etc.) are component-scoped and do not bubble

### 3.5.3 Focus Management

Tab order within composed components follows these rules:

1. **Linear tab order**: Tab moves through interactive elements in DOM order (top-to-bottom, left-to-right)
2. **Roving tabindex**: Within radio groups, tab groups, and toolbars, one element has tabindex=0, others have tabindex=-1. ArrowKeys move within the group.
3. **Focus trap**: Modal, CommandPalette, SlideOver trap focus inside. Tab wraps from last to first element.
4. **Focus restoration**: When a Modal/SlideOver/CommandPalette closes, focus MUST return to the element that triggered it.
5. **Skip navigation**: AppHeader MUST include a visually hidden "Skip to main content" link as the first focusable element.

### 3.5.4 Naming Convention

| Platform | Pattern | Example |
|----------|---------|---------|
| Web (React) | PascalCase | `Button`, `DataTable`, `FormField`, `ChatMessage` |
| Flutter | K-prefix PascalCase | `KButton`, `KDataTable`, `KFormField`, `KChatMessage` |
| CSS classes | kebab-case with `prism-` prefix | `prism-button`, `prism-data-table` |
| Token CSS variables | `--{path}` with hyphens | `--button-primary-bg`, `--input-default-border` |
| Props (both platforms) | camelCase | `onClick`, `maxLength`, `iconLeft` |
| Dart parameters | camelCase (Dart convention) | `onTap`, `maxLength`, `iconLeft` |

### 3.5.5 Component Size Inventory

| Category | Count | Components |
|----------|-------|-----------|
| Atoms | 25 | Button, IconButton, TextInput, TextArea, Select, Checkbox, Radio, Toggle, Label, Badge, Avatar, Icon, Tag, Tooltip, Spinner, ProgressBar, Skeleton, Divider, Link, Typography, Image, VisuallyHidden, Kbd, StatusDot, Separator |
| Molecules | 22 | FormField, SearchBar, SelectField, DatePicker, FileUpload, NavItem, Breadcrumb, Pagination, Tab, AlertBanner, Toast, EmptyState, MetricCard, UserCard, ListItem, MenuItem, DropdownMenu, Popover, DialogActions, TagInput, ToggleGroup, StepIndicator |
| Organisms | 22 | AppHeader, Sidebar, DataTable, Form, Modal, CommandPalette, SlideOver, FilterPanel, CardGrid, ListView, Toolbar, StatsRow, FormWizard, NotificationCenter, SettingsSection, ChatMessage, ChatInput, StreamOfThought, ActionPlan, CitationPanel, ConversationSidebar, SuggestionChips |
| **Total** | **69** | |

Every component listed here MUST have a contract file in `specs/components/{name}.yaml`. The 69 contracts above are the complete Prism component set. Adding a new component requires a spec amendment (MINOR version bump to the spec).
