// Best-effort background fetch to warm the `ngsw` dataGroup cache for a
// recording. Fired after the live <audio> stream has already proven
// reachable (see mini-player's onLoadedMetadata), never as part of the
// critical playback path — see DESIGN.md's "Opportunistic caching" section
// for why this needs to be a plain, headerless request rather than relying
// on the <audio> element's own (always Range-bearing) requests.
export function warmRecordingCache(url: string): void {
  if (!navigator.serviceWorker?.controller) return;
  fetch(url, { mode: 'no-cors' }).catch(() => {});
}
