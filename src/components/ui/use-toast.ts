import { useEffect, useState } from 'react';

export interface Toast {
  id: number;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

const TOAST_DURATION_MS = 3000;

let toastsState: Toast[] = [];
let listeners: Array<(toasts: Toast[]) => void> = [];
let nextId = 0;

function emit() {
  for (const listener of listeners) listener(toastsState);
}

export function toast(data: Omit<Toast, 'id'>) {
  const id = ++nextId;
  toastsState = [...toastsState, { ...data, id }];
  emit();
  setTimeout(() => {
    toastsState = toastsState.filter((t) => t.id !== id);
    emit();
  }, TOAST_DURATION_MS);
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastsState);
  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);
  return { toasts, toast };
}
