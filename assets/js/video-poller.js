/**
 * Status polling (Phase 8, spec 15). Deliberately conservative:
 *   - interval 3s (within the 2-5s guidance), never shorter
 *   - waits for a request to finish before scheduling the next (no overlap)
 *   - stops on a terminal state, on timeout, and after repeated errors
 *   - PAUSES while the tab is hidden and resumes (with an immediate check)
 *     when it becomes visible again
 *   - one poller per page; start() replaces any running one
 */

const VideoPoller = (() => {
  const INTERVAL_MS = 3000;
  const MAX_DURATION_MS = 4 * 60 * 60 * 1000; // give up after 4h of waiting
  const MAX_CONSECUTIVE_ERRORS = 5;

  let timer = null;
  let running = false;
  let startedAt = 0;
  let errors = 0;
  let fetchStatus = null;
  let onUpdate = null;
  let isDone = null;
  let onStop = null;
  let inFlight = false;

  function clear() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function stop(reason) {
    if (!running) return;
    running = false;
    clear();
    document.removeEventListener('visibilitychange', onVisibility);
    if (onStop) onStop(reason);
  }

  function schedule(delay = INTERVAL_MS) {
    clear();
    if (!running) return;
    if (document.hidden) return; // resumes from onVisibility
    timer = setTimeout(tick, delay);
  }

  async function tick() {
    if (!running || inFlight) return;
    if (Date.now() - startedAt > MAX_DURATION_MS) return stop('timeout');
    inFlight = true;
    try {
      const data = await fetchStatus();
      errors = 0;
      if (!running) return;
      onUpdate(data);
      if (isDone(data)) return stop('done');
    } catch (err) {
      errors += 1;
      if (onUpdate) onUpdate(null, err);
      // A dead session or a permanent error will not fix itself: stop.
      if (err && (err.status === 401 || err.status === 403 || err.status === 404)) return stop('fatal');
      if (errors >= MAX_CONSECUTIVE_ERRORS) return stop('errors');
    } finally {
      inFlight = false;
    }
    schedule();
  }

  function onVisibility() {
    if (!running) return;
    if (document.hidden) clear();
    else schedule(0); // check right away on return
  }

  /**
   * @param {{fetch:()=>Promise<any>, onUpdate:(data,err?)=>void, isDone:(data)=>boolean, onStop?:(reason)=>void}} o
   */
  function start(o) {
    stop('replaced');
    fetchStatus = o.fetch;
    onUpdate = o.onUpdate;
    isDone = o.isDone;
    onStop = o.onStop || null;
    running = true;
    startedAt = Date.now();
    errors = 0;
    document.addEventListener('visibilitychange', onVisibility);
    schedule(0);
  }

  return { start, stop, isRunning: () => running, INTERVAL_MS };
})();
