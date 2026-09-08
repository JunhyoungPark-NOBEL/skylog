import { useEffect, useState } from 'react';
import { onDbChange } from '@/db/events';
import { readLearning, type LearningState } from '@/learn/runtime';
export function useLearning() {
  const [value, setValue] = useState<LearningState | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true,
      seq = 0;
    const refresh = async () => {
      const current = ++seq;
      try {
        const data = await readLearning();
        if (alive && current === seq) {
          setValue(data);
          setError(false);
        }
      } catch {
        if (alive && current === seq) setError(true);
      }
    };
    void refresh();
    const stop = onDbChange((t) => {
      if (['progress', 'observations', 'blobs', 'equipment', 'all'].includes(t)) void refresh();
    });
    return () => {
      alive = false;
      stop();
    };
  }, [retry]);
  return { value, error, retry: () => setRetry((n) => n + 1) };
}
