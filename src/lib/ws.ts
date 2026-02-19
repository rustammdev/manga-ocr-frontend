import { useEffect, useRef } from "react";
import type { WsMessage } from "./types";

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
