// Reusable presentational functional-state library.
//
// Building blocks:
//   - <StateBanner />  full-width status banner (info/warning/error/success/loading)
//   - <InlineAlert />  lightweight inline alert for cards, forms, dialogs
//
// Ready-made presets:
//   - STATE_CONFIGS    map of named functional states -> { variant, icon, copy }
//   - <StateMessage state="..." />  renders a StateBanner from a preset
//
// All purely presentational — pass data/handlers (actions) from the call site.

export { StateBanner, STATE_VARIANT_STYLES } from "./StateBanner";
export type { StateBannerProps, StateVariant } from "./StateBanner";

export { InlineAlert } from "./InlineAlert";
export type { InlineAlertProps } from "./InlineAlert";

export { StateMessage, STATE_CONFIGS } from "./stateConfigs";
export type { StateKey, StateConfig, StateMessageProps } from "./stateConfigs";
