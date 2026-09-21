import * as React from "react";

export type OfflineActionKind = "session-kickoff" | "session-action";

export interface OfflineQueueItem {
  id: string;
  kind: OfflineActionKind;
  payload: Record<string, unknown>;
  createdAt: string;
  attemptCount: number;
  lastAttemptAt?: string;
}

const OFFLINE_QUEUE_KEY = "brenner-offline-queue";
const OFFLINE_QUEUE_EVENT = "brenner-offline-queue-change";
const FORBIDDEN_RECORD_KEYS = new Set(["__proto__", "prototype", "constructor"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(obj: Record<string, unknown>, key: string): boolean {
  return Object.hasOwn(obj, key);
}

function isQueueItem(value: unknown): value is OfflineQueueItem {
  if (!isRecord(value)) return false;
  const record = value;

  for (const key of FORBIDDEN_RECORD_KEYS) {
    if (hasOwn(record, key)) return false;
  }

  if (!hasOwn(record, "id") || typeof record.id !== "string") return false;
  if (
    !hasOwn(record, "kind") ||
    (record.kind !== "session-kickoff" && record.kind !== "session-action")
  )
    return false;
  if (!hasOwn(record, "createdAt") || typeof record.createdAt !== "string") return false;
  if (!hasOwn(record, "attemptCount") || typeof record.attemptCount !== "number") return false;
  if (!hasOwn(record, "payload") || !isRecord(record.payload)) return false;
  return true;
}

function createQueueId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `offline-${uuid}`;
  return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

export function getOfflineQueue(): OfflineQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isQueueItem);
  } catch {
    return [];
  }
}

function writeOfflineQueue(items: OfflineQueueItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage failures
  }
  window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_EVENT));
}

export function enqueueOfflineAction(
  kind: OfflineActionKind,
  payload: Record<string, unknown>,
): OfflineQueueItem {
  const item: OfflineQueueItem = {
    id: createQueueId(),
    kind,
    payload,
    createdAt: new Date().toISOString(),
    attemptCount: 0,
  };
  const existing = getOfflineQueue();
  writeOfflineQueue([...existing, item]);
  return item;
}

async function dispatchQueueItem(item: OfflineQueueItem): Promise<boolean> {
  const endpoint = item.kind === "session-kickoff" ? "/api/sessions" : "/api/sessions/actions";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item.payload),
    });

    const data = (await response.json()) as { success?: boolean };
    return Boolean(response.ok && data?.success);
  } catch {
    return false;
  }
}

export async function flushOfflineQueue(): Promise<{
  sent: number;
  failed: number;
  remaining: number;
}> {
  if (!isOnline()) {
    const remaining = getOfflineQueue().length;
    return { sent: 0, failed: 0, remaining };
  }

  const items = getOfflineQueue();
  if (items.length === 0) {
    return { sent: 0, failed: 0, remaining: 0 };
  }

  const remaining: OfflineQueueItem[] = [];
  let sent = 0;
  let failed = 0;

  for (const item of items) {
    const ok = await dispatchQueueItem(item);
    if (ok) {
      sent += 1;
      continue;
    }

    failed += 1;
    remaining.push({
      ...item,
      attemptCount: item.attemptCount + 1,
      lastAttemptAt: new Date().toISOString(),
    });
  }

  writeOfflineQueue(remaining);
  return { sent, failed, remaining: remaining.length };
}

export function useNetworkStatus() {
  const [isOnlineState, setIsOnlineState] = React.useState<boolean>(() => isOnline());

  React.useEffect(() => {
    const handleOnline = () => setIsOnlineState(true);
    const handleOffline = () => setIsOnlineState(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline: isOnlineState };
}

export function useOfflineQueue() {
  const { isOnline: online } = useNetworkStatus();
  const [queue, setQueue] = React.useState<OfflineQueueItem[]>(() => getOfflineQueue());
  const [isFlushing, setIsFlushing] = React.useState(false);

  React.useEffect(() => {
    const handleQueueUpdate = () => setQueue(getOfflineQueue());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === OFFLINE_QUEUE_KEY) {
        setQueue(getOfflineQueue());
      }
    };
    window.addEventListener(OFFLINE_QUEUE_EVENT, handleQueueUpdate as EventListener);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(OFFLINE_QUEUE_EVENT, handleQueueUpdate as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const flush = React.useCallback(async () => {
    if (isFlushing) return { sent: 0, failed: 0, remaining: queue.length };
    setIsFlushing(true);
    try {
      const result = await flushOfflineQueue();
      setQueue(getOfflineQueue());
      return result;
    } finally {
      setIsFlushing(false);
    }
  }, [isFlushing, queue.length]);

  React.useEffect(() => {
    if (!online || queue.length === 0 || isFlushing) return;
    void flush();
  }, [online, queue.length, isFlushing, flush]);

  return {
    queue,
    queuedCount: queue.length,
    isFlushing,
    flush,
    isOnline: online,
  };
}

export async function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    // ignore registration failures
  }
}
