// A new app version has downloaded and is ready, but must never interrupt an
// active Focus session. sessionStorage is enough here: the flag only needs
// to survive the rest of this browser tab's life, not across devices or
// restarts — if the tab closes before it's applied, the next visit simply
// gets the new version directly on load, no flag needed.

const KEY = "dp-update-pending";

export function markUpdatePending(): void {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* private mode etc. — worst case the update applies on next natural load */
  }
}

export function isUpdatePending(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
