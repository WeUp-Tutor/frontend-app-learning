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
    return null; // ou undefined, ou {} selon ton contrat d'API
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

export default function TimeTracking() {
  console.log('TIME_TRACKING_BUILD_V4');

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
  const isTrackingRef = useRef(false);
  const startTimestampRef = useRef(null);
  const idleTimerRef = useRef(null);
  const hiddenRef = useRef(false);

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

  const stopAndSend = useCallback(async (reason, explicitContext = null, options = {}) => {
    const seconds = endTimer();
    if (seconds > 0) {
      await sendTime(seconds, reason, explicitContext, options);
    }
  }, [endTimer, sendTime]);

  const startTimer = useCallback((explicitContext = null) => {
    const currentContext = explicitContext || contextRef.current;

    if (!currentContext) {
      debugLog('startTimer-skipped-no-context');
      return;
    }

    startTimestampRef.current = Date.now();
    isTrackingRef.current = true;

    debugLog('timer-started', { currentContext });

    clearIdleTimer();
    idleTimerRef.current = window.setTimeout(() => {
      debugLog('idle-timeout-fired', { currentContext });
      stopAndSend('idle', currentContext);
    }, IDLE_DELAY);
  }, [clearIdleTimer, stopAndSend]);

  useEffect(() => {
    const previousContext = contextRef.current;
    const previousKey = trackingKeyRef.current;

    if (!context) {
      if (isTrackingRef.current && previousContext) {
        stopAndSend('leave-learning', previousContext);
      }
      contextRef.current = null;
      trackingKeyRef.current = '';
      return;
    }

    if (
      previousKey &&
      previousKey !== trackingKey &&
      isTrackingRef.current &&
      previousContext
    ) {
      stopAndSend('route-change', previousContext);
    }

    contextRef.current = context;
    trackingKeyRef.current = trackingKey;

    if (!isTrackingRef.current) {
      startTimer(context);
    }
  }, [context, trackingKey, startTimer, stopAndSend]);

  useEffect(() => {
    const resetIdleCountdown = () => {
      const currentContext = contextRef.current;

      if (!currentContext || document.hidden || !isTrackingRef.current) {
        return;
      }

      clearIdleTimer();
      idleTimerRef.current = window.setTimeout(() => {
        debugLog('idle-timeout-fired', { currentContext });
        stopAndSend('idle', currentContext);
      }, IDLE_DELAY);
    };

    const handleUserActivity = () => {
      const currentContext = contextRef.current;

      if (!currentContext || document.hidden) {
        return;
      }

      if (!isTrackingRef.current) {
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
      } else if (hiddenRef.current) {
        hiddenRef.current = false;
        startTimer(currentContext);
      }
    };

    const handlePageHide = () => {
      const currentContext = contextRef.current;
      const seconds = endTimer();

      if (seconds > 0) {
        sendTime(seconds, 'unload', currentContext, { keepalive: true });
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
  }, [clearIdleTimer, endTimer, sendTime, startTimer, stopAndSend]);

  return null;
}
