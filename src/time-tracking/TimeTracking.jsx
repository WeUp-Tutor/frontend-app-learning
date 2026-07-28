import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const IDLE_DELAY = 15 * 60 * 1000;       // 15 min sans activité => idle
const HEARTBEAT_INTERVAL = 30 * 1000;    // on envoie un petit incrément toutes les 30s
const MAX_HEARTBEAT_GAP = 90 * 1000;     // au-delà, on ne renvoie jamais l'écart réel
                                          // (veille, tab freeze, throttling navigateur...),
                                          // seulement l'intervalle nominal.
const LEADER_TTL = 5000;                 // un onglet "leader" doit se re-signaler toutes les 5s

const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'pointerdown',
];

const DEBUG = true;

function debugLog(label, data = {}) {
  if (!DEBUG) return;
}

function getLmsBaseUrl() {
  const url = new URL(window.location.origin);
  url.hostname = url.hostname.replace(/^apps\./, '');
  return url.origin;
}

function getCourseIdFromPath(pathname) {
  debugLog('getCourseIdFromPath-input', { pathname });

  const learningMatch = pathname.match(/^\/learning\/course\/([^/]+)\/?(.*)$/);
  if (learningMatch) {
    const value = decodeURIComponent(learningMatch[1]);
    debugLog('getCourseIdFromPath-learningMatch', { value });
    return value;
  }

  const courseMatch = pathname.match(/^\/course\/([^/]+)\/?(.*)$/);
  if (courseMatch) {
    const value = decodeURIComponent(courseMatch[1]);
    debugLog('getCourseIdFromPath-courseMatch', { value });
    return value;
  }

  debugLog('getCourseIdFromPath-noMatch');
  return '';
}

function extractBlockByType(pathname, type) {
  const regex = new RegExp(`(block-v1:[^/]*type@${type}\\+block@[^/]+)`);
  const match = pathname.match(regex);
  return match ? decodeURIComponent(match[1]).split('block@')[1] : '';
}

function getTrackingContext(pathname) {
  const isLearningRoute = pathname.startsWith('/learning/course/');
  const isCourseRoute = pathname.startsWith('/course/');

  debugLog('getTrackingContext-route-check', {
    pathname,
    isLearningRoute,
    isCourseRoute,
  });

  if (!isLearningRoute && !isCourseRoute) {
    debugLog('getTrackingContext-return-null-route');
    return null;
  }

  const courseId = getCourseIdFromPath(pathname);
  debugLog('getTrackingContext-courseId', { courseId });

  if (!courseId) {
    debugLog('getTrackingContext-return-null-courseId');
    return null;
  }

  if (pathname.includes('/discussion/')) {
    const result = {
      courseId,
      section: 'forum',
      subSection: 'forum',
    };
    debugLog('getTrackingContext-discussion-result', result);
    return result;
  }

  const section = extractBlockByType(pathname, 'sequential');
  const subSection = extractBlockByType(pathname, 'vertical');

  if (!section || !subSection) {
    // au moins un des deux est vide → on ne renvoie rien
    return null;
  }

  const result = {
    courseId,
    section,
    subSection,
  };

  debugLog('getTrackingContext-result', result);
  return result;
}

function buildEndpoint(courseId) {
  return `${getLmsBaseUrl()}/wul_apps/time_tracking/${encodeURIComponent(courseId)}/add_time_tracking/`;
}

function buildPayload(seconds, reason, context) {
  return {
    course_id: context.courseId,
    course_section: context.section || '',
    course_sub_section: context.subSection || '',
    time: seconds,
    reason: reason || '',
  };
}

function getLeaderKey(courseId) {
  return `time_tracker_leader::${courseId}`;
}

export default function TimeTracking() {
  const location = useLocation();
  const context = useMemo(() => getTrackingContext(location.pathname), [location.pathname]);

  const trackingKey = useMemo(() => {
    if (!context) {
      return '';
    }
    return [context.courseId, context.section, context.subSection].join('::');
  }, [context]);

  const contextRef = useRef(context);
  const trackingKeyRef = useRef(trackingKey);
  const isActiveRef = useRef(false);
  const lastHeartbeatAtRef = useRef(null);
  const lastActivityAtRef = useRef(Date.now());
  const idleTimerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const hiddenRef = useRef(false);
  const tabIdRef = useRef(Math.random().toString(36).slice(2));

  useEffect(() => {
    debugLog('mounted');
  }, []);

  useEffect(() => {
    debugLog('route-change-detected', {
      pathname: location.pathname,
      context,
      trackingKey,
    });
  }, [location.pathname, context, trackingKey]);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  // ---- Election d'un "onglet leader" pour éviter le sur-comptage multi-onglets
  //      ouverts simultanément sur le même cours. ----
  const isLeader = useCallback((courseId) => {
    try {
      const raw = localStorage.getItem(getLeaderKey(courseId));
      if (!raw) return true;
      const data = JSON.parse(raw);
      if (Date.now() - data.ts > LEADER_TTL) return true; // ancien leader mort
      return data.id === tabIdRef.current;
    } catch (e) {
      return true; // localStorage indisponible : pas de dédup, mais on continue
    }
  }, []);

  const claimLeadership = useCallback((courseId) => {
    try {
      localStorage.setItem(
        getLeaderKey(courseId),
        JSON.stringify({ id: tabIdRef.current, ts: Date.now() }),
      );
    } catch (e) {
      /* pas grave, dédup simplement désactivée */
    }
  }, []);

  const sendTime = useCallback(async (seconds, reason, explicitContext = null, options = {}) => {
    const currentContext = explicitContext || contextRef.current;
    const { keepalive = false } = options;

    if (!currentContext || !currentContext.courseId || !seconds || seconds <= 0) {
      debugLog('sendTime-skipped', { seconds, reason, currentContext });
      return;
    }

    const endpoint = buildEndpoint(currentContext.courseId);
    const payload = buildPayload(seconds, reason, currentContext);

    debugLog('sendTime-before-fetch', {
      endpoint,
      payload,
      origin: window.location.origin,
      keepalive,
    });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(payload),
        keepalive,
      });

      const responseText = await response.text();

      debugLog('sendTime-response', {
        status: response.status,
        ok: response.ok,
        responseText,
      });
    } catch (error) {
      debugLog('sendTime-error', {
        message: error?.message,
        stack: error?.stack,
      });
    }
  }, []);

  // Calcule un incrément borné depuis le dernier heartbeat, sans jamais renvoyer
  // un écart brut (donc jamais de "trou" de plusieurs heures après une veille).
  const computeBoundedElapsed = useCallback(() => {
    const now = Date.now();
    if (!lastHeartbeatAtRef.current) {
      lastHeartbeatAtRef.current = now;
      return HEARTBEAT_INTERVAL / 1000;
    }
    const gap = now - lastHeartbeatAtRef.current;
    lastHeartbeatAtRef.current = now;
    return gap > MAX_HEARTBEAT_GAP
      ? HEARTBEAT_INTERVAL / 1000
      : Math.round(gap / 1000);
  }, []);

  const flushPending = useCallback((reason, explicitContext = null, options = {}) => {
    if (!isActiveRef.current || !lastHeartbeatAtRef.current) {
      return;
    }
    const gap = Date.now() - lastHeartbeatAtRef.current;
    const elapsed = Math.round(Math.min(gap, HEARTBEAT_INTERVAL) / 1000);
    lastHeartbeatAtRef.current = null;
    if (elapsed > 0) {
      sendTime(elapsed, reason, explicitContext, options);
    }
  }, [sendTime]);

  const startTimer = useCallback((explicitContext = null) => {
    const currentContext = explicitContext || contextRef.current;

    if (!currentContext) {
      debugLog('startTimer-skipped-no-context');
      return;
    }

    isActiveRef.current = true;
    lastHeartbeatAtRef.current = Date.now();

    debugLog('timer-started', { currentContext });

    clearIdleTimer();
    idleTimerRef.current = window.setTimeout(() => {
      debugLog('idle-timeout-fired', { currentContext });
      flushPending('idle', currentContext);
      isActiveRef.current = false;
    }, IDLE_DELAY);
  }, [clearIdleTimer, flushPending]);

  const stopAndSend = useCallback((reason, explicitContext = null, options = {}) => {
    flushPending(reason, explicitContext, options);
    isActiveRef.current = false;
    clearIdleTimer();
  }, [flushPending, clearIdleTimer]);

  // Tick périodique global : envoie un heartbeat seulement si actif, visible,
  // et si cet onglet est le leader pour le cours courant.
  useEffect(() => {
    heartbeatTimerRef.current = window.setInterval(() => {
      const currentContext = contextRef.current;

      if (!isActiveRef.current || document.hidden || !currentContext) {
        return;
      }

      if (!isLeader(currentContext.courseId)) {
        return;
      }

      claimLeadership(currentContext.courseId);

      const elapsed = computeBoundedElapsed();
      sendTime(elapsed, 'heartbeat', currentContext);
    }, HEARTBEAT_INTERVAL);

    return () => {
      if (heartbeatTimerRef.current) {
        window.clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [isLeader, claimLeadership, computeBoundedElapsed, sendTime]);

  useEffect(() => {
    const previousContext = contextRef.current;
    const previousKey = trackingKeyRef.current;

    if (!context) {
      if (isActiveRef.current && previousContext) {
        stopAndSend('leave-learning', previousContext);
      }
      contextRef.current = null;
      trackingKeyRef.current = '';
      return;
    }

    if (
      previousKey &&
      previousKey !== trackingKey &&
      isActiveRef.current &&
      previousContext
    ) {
      // on flush le temps accumulé sur l'ancienne section avant de basculer
      flushPending('route-change', previousContext);
    }

    contextRef.current = context;
    trackingKeyRef.current = trackingKey;

    if (!isActiveRef.current) {
      startTimer(context);
    } else {
      // on continue de tracker, mais on repart d'un compteur propre pour
      // la nouvelle section
      lastHeartbeatAtRef.current = Date.now();
    }
  }, [context, trackingKey, startTimer, stopAndSend, flushPending]);

  useEffect(() => {
    const resetIdleCountdown = () => {
      const currentContext = contextRef.current;

      if (!currentContext || document.hidden || !isActiveRef.current) {
        return;
      }

      clearIdleTimer();
      idleTimerRef.current = window.setTimeout(() => {
        debugLog('idle-timeout-fired', { currentContext });
        flushPending('idle', currentContext);
        isActiveRef.current = false;
      }, IDLE_DELAY);
    };

    const handleUserActivity = () => {
      const currentContext = contextRef.current;
      lastActivityAtRef.current = Date.now();

      if (!currentContext || document.hidden) {
        return;
      }

      if (!isActiveRef.current) {
        startTimer(currentContext);
        return;
      }

      resetIdleCountdown();
    };

    const handleVisibilityChange = () => {
      const currentContext = contextRef.current;

      if (!currentContext) {
        return;
      }

      if (document.hidden) {
        hiddenRef.current = true;
        stopAndSend('hidden', currentContext);
        clearIdleTimer();
      } else if (hiddenRef.current) {
        hiddenRef.current = false;
        // on ne relance que si l'utilisateur a été actif il y a moins de IDLE_DELAY
        if (Date.now() - lastActivityAtRef.current < IDLE_DELAY) {
          startTimer(currentContext);
        }
      }
    };

    const handlePageHide = () => {
      const currentContext = contextRef.current;
      // fetch+keepalive plutôt que sendBeacon : l'endpoint est cross-origin
      // (sous-domaine apps.* → domaine racine) et envoie du JSON avec des
      // headers custom, ce que sendBeacon ne peut pas garantir sans préflight.
      stopAndSend('unload', currentContext, { keepalive: true });
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });

      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);

      clearIdleTimer();
    };
  }, [clearIdleTimer, flushPending, startTimer, stopAndSend]);

  return null;
}

