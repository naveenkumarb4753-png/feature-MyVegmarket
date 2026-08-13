import { type Href, type Router } from "expo-router";

/**
 * Safe back navigation.
 *
 * `router.back()` throws `The action 'GO_BACK' was not handled by any navigator`
 * whenever there is no previous entry in the navigation stack. That happens when
 * a screen is reached via `router.replace(...)` (e.g. after an auth wall resolves),
 * opened from a deep link, or shown as the first route. To keep back navigation
 * reliable everywhere, guard with `canGoBack()` and fall back to a known-safe
 * route when the stack is empty.
 */
export function safeBack(router: Router, fallback: Href = "/(tabs)") {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
