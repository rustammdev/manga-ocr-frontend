import { useEffect, useRef } from "react";
import type { Chapter, WsMessage } from "./types";

export function useJobWebSocket(
  jobId: string | null | undefined,
  onMessage: (msg: WsMessage) => void,
  onClose?: () => void
) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${location.host}/ws/jobs/${jobId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsMessage;
        onMessage(data);
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      if (onClose) onClose();
    };

    return () => {
      ws.close();
    };
  }, [jobId, onClose, onMessage]);
}

export function usePublishWebSocket(
  publishId: string | null | undefined,
  onMessage: (msg: WsMessage) => void,
  onClose?: () => void
) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!publishId) return;

    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${location.host}/ws/publish/${publishId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsMessage;
        onMessage(data);
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      if (onClose) onClose();
    };

    return () => {
      ws.close();
    };
  }, [publishId, onClose, onMessage]);
}

export function useAutoPilotWebSocket(
  autoPilotId: string | null | undefined,
  onMessage: (msg: WsMessage) => void,
  onClose?: () => void
) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!autoPilotId) return;

    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${location.host}/ws/auto-pilot/${autoPilotId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsMessage;
        onMessage(data);
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      if (onClose) onClose();
    };

    return () => {
      ws.close();
    };
  }, [autoPilotId, onClose, onMessage]);
}

export type JobFinishInfo = {
  chapterName: string;
  oldStatus: string;
  type: "done" | "error" | "cancelled";
  message: string;
};

/**
 * Active chapterlarning job_id lariga WebSocket ulanib,
 * job tugaganda (done/error/cancelled) callback chaqiradi.
 *
 * Tugagan job_id lar eslab qolinadi — qayta ulanilmaydi.
 */
export function useActiveJobsWatcher(
  chapters: Chapter[],
  onJobFinished: (info: JobFinishInfo) => void,
) {
  const connectionsRef = useRef<Map<string, WebSocket>>(new Map());
  const finishedRef = useRef<Set<string>>(new Set());
  const onJobFinishedRef = useRef(onJobFinished);
  onJobFinishedRef.current = onJobFinished;

  useEffect(() => {
    const activeJobs = new Map<string, { name: string; status: string }>();
    for (const ch of chapters) {
      if (
        (ch.status === "processing" || ch.status === "translating") &&
        ch.job_id
      ) {
        activeJobs.set(ch.job_id, { name: ch.name, status: ch.status });
      }
    }

    const current = connectionsRef.current;
    const finished = finishedRef.current;

    // Endi kerak bo'lmagan ulanishlarni yopish
    for (const [jobId, ws] of current) {
      if (!activeJobs.has(jobId)) {
        ws.close();
        current.delete(jobId);
      }
    }

    // Yangi joblar uchun WS ochish
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    for (const [jobId, { name, status }] of activeJobs) {
      if (current.has(jobId) || finished.has(jobId)) continue;

      const ws = new WebSocket(`${proto}//${location.host}/ws/jobs/${jobId}`);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WsMessage;
          if (data.type === "done" || data.type === "error" || data.type === "cancelled") {
            finished.add(jobId);
            onJobFinishedRef.current({
              chapterName: name,
              oldStatus: status,
              type: data.type,
              message: data.message,
            });
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        current.delete(jobId);
      };

      current.set(jobId, ws);
    }

    // Unmount da barcha ulanishlarni yopish (finished set saqlanadi)
  }, [chapters]);

  // Component unmount da tozalash
  useEffect(() => {
    return () => {
      for (const ws of connectionsRef.current.values()) {
        ws.close();
      }
      connectionsRef.current.clear();
      finishedRef.current.clear();
    };
  }, []);
}
