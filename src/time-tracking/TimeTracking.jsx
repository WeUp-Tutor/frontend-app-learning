// src/time-tracking/TimeTracking.jsx
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const IDLE_DELAY = 15 * 60 * 1000;
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
  console.log(`[TimeTracking] ${label}`, data);
}


function getCookie(name) {
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split('=');
    if (key === name) {
      return decodeURIComponent(valueParts.join('='));
    }
  }
  return null;
}

function getLmsBaseUrl() {
  const url = new URL(window.location.origin);
  url.hostname = url.hostname.replace(/^apps\./, '');
  return url.origin;
}

function getCourseIdFromPath(pathname) {
  const match = pathname.match(/^\/learning\/course\/([^/]+)\/?(.*)$/);
  return match ? decodeURIComponent(match[1]) : '';
}

function extractBlockByType(pathname, type) {
  const regex = new RegExp(`(block-v1:[^/]*type@${type}\\+block@[^/]+)`);
  const match = pathname.match(regex);
  return match ? decodeURIComponent(match[1]) : '';
}

function getTrackingContext(pathname) {
  if (!pathname.startsWith('/learning/course/')) {
    return null;
  }

  const courseId = getCourseIdFromPath(pathname);

  if (!courseId) {
    return null;
  }

  if (pathname.includes('/discussion/')) {
    return {
      courseId,
      section: 'forum',
      subSection: 'forum',
    };
  }

  return {
    courseId,
    section: extractBlockByType(pathname, 'sequential'),
    subSection: extractBlockByType(pathname, 'vertical'),
  };
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

export default function TimeTracking() {



  const location = useLocation();

  const context = useMemo(
    () => getTrackingContext(location.pathname),
    [location.pathname]
  );

  const trackingKey = useMemo(() => {
    if (!context) {
      return '';
    }
    return [context.courseId, context.section, context.subSection].join('::');
  }, [context]);





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




  const contextRef = useRef(context);
  const trackingKeyRef = useRef(trackingKey);
  const isTrackingRef = useRef(false);
  const startTimestampRef = useRef(null);
  const idleTimerRef = useRef(null);
  const hiddenRef = useRef(false);

  useEffect(() => {
    contextRef.current = context;
    trackingKeyRef.current = trackingKey;
  }, [context, trackingKey]);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const sendTime = useCallback(async (seconds, reason, explicitContext = null) => {
    const currentContext = explicitContext || contextRef.current;

    if (!currentContext || !currentContext.courseId || !seconds || seconds <= 0) {
      debugLog('sendTime-skipped', { seconds, reason, currentContext });

      return;

    }

    const endpoint = buildEndpoint(currentContext.courseId);
    const payload = buildPayload(seconds, reason, currentContext);

    debugLog('sendTime-before-fetch', {
      endpoint,
      payload,
      csrfTokenPresent: !!getCookie('csrftoken'),
      origin: window.location.origin,
    });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(payload),
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

  const sendTimeOnUnload = useCallback((seconds, explicitContext = null) => {
    const currentContext = explicitContext || contextRef.current;

    if (!currentContext || !currentContext.courseId || !seconds || seconds <= 0) {
      return;
    }

    const endpoint = buildEndpoint(currentContext.courseId);
    const payload = buildPayload(seconds, 'unload', currentContext);

    if (navigator.sendBeacon) {
      const body = new URLSearchParams();
      Object.entries(payload).forEach(([key, value]) => {
        body.append(key, String(value ?? ''));
      });
      navigator.sendBeacon(endpoint, body);
      return;
    }

    fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') || '',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }, []);

  const endTimer = useCallback(() => {
    if (!isTrackingRef.current || !startTimestampRef.current) {

      debugLog('endTimer-skipped', {
        isTracking: isTrackingRef.current,
        startTimestamp: startTimestampRef.current,
      });

      return 0;
    }

    const seconds = Math.round((Date.now() - startTimestampRef.current) / 1000);

    isTrackingRef.current = false;
    startTimestampRef.current = null;
    clearIdleTimer();

    debugLog('timer-stopped', { seconds });

    return seconds > 0 ? seconds : 0;
  }, [clearIdleTimer]);

  const stopAndSend = useCallback((reason, explicitContext = null) => {
    const seconds = endTimer();
    if (seconds > 0) {
      sendTime(seconds, reason, explicitContext);
    }
  }, [endTimer, sendTime]);

  const startTimer = useCallback((explicitContext = null) => {
    const currentContext = explicitContext || contextRef.current;

    if (!currentContext) {
      debugLog('startTimer-skipped-no-context');

      return;
    }


    if (!isTrackingRef.current) {
      startTimestampRef.current = Date.now();
      isTrackingRef.current = true;
      debugLog('timer-started', { currentContext });
  
    } else {
      debugLog('timer-already-running', { currentContext });
    }

    clearIdleTimer();
    idleTimerRef.current = window.setTimeout(() => {
      debugLog('idle-timeout-fired', { currentContext });
      stopAndSend('idle', currentContext);
    }, IDLE_DELAY);
  }, [clearIdleTimer, stopAndSend]);

  useEffect(() => {
    if (!context) {
      if (isTrackingRef.current) {
        stopAndSend('leave-learning');
      }
      return undefined;
    }

    const previousContext = contextRef.current;
    const previousKey = trackingKeyRef.current;

    if (previousKey && previousKey !== trackingKey && isTrackingRef.current) {
      stopAndSend('route-change', previousContext);
    }

    contextRef.current = context;
    trackingKeyRef.current = trackingKey;
    startTimer(context);

    return undefined;
  }, [context, trackingKey, startTimer, stopAndSend]);

  useEffect(() => {
    const handleUserActivity = () => {
      const currentContext = contextRef.current;

      if (!currentContext || document.hidden) {
        return;
      }

      if (!isTrackingRef.current) {
        startTimer(currentContext);
        return;
      }

      clearIdleTimer();
      idleTimerRef.current = window.setTimeout(() => {
        stopAndSend('idle', currentContext);
      }, IDLE_DELAY);
    };

    const handleVisibilityChange = () => {
      const currentContext = contextRef.current;

      if (!currentContext) {
        return;
      }

      if (document.hidden) {
        hiddenRef.current = true;
        stopAndSend('hidden', currentContext);
      } else if (hiddenRef.current) {
        hiddenRef.current = false;
        startTimer(currentContext);
      }
    };

    const handlePageHide = () => {
      const currentContext = contextRef.current;
      const seconds = endTimer();

      if (seconds > 0) {
        sendTimeOnUnload(seconds, currentContext);
      }
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
  }, [clearIdleTimer, endTimer, sendTimeOnUnload, startTimer, stopAndSend]);

  return null;
}
