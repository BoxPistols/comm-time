"use client";

import { useState, useRef } from "react";

export function useDeadlineAlertSettings() {
  const [deadlineAlertEnabled, setDeadlineAlertEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("deadlineAlertEnabled") === "true";
    }
    return false;
  });

  const [deadlineAlertMinutes, setDeadlineAlertMinutes] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("deadlineAlertMinutes");
      return saved ? parseInt(saved, 10) : 60;
    }
    return 60;
  });

  const alertedTodoIdsRef = useRef<Set<string>>(new Set());

  return {
    deadlineAlertEnabled, setDeadlineAlertEnabled,
    deadlineAlertMinutes, setDeadlineAlertMinutes,
    alertedTodoIdsRef,
  };
}
