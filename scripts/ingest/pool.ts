/**
 * Runs `worker` over `items` with at most `concurrency` calls in flight.
 * Rejects with the first error a worker throws (workers should catch their own).
 */
export async function forEachConcurrent<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError(`concurrency must be a positive integer, got ${concurrency}`);
  }
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const index = next++;
      await worker(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, lane));
}

/**
 * Serial queue: tasks run one after another in the order they were enqueued, even when
 * enqueued from concurrent workers. Used so database writes never overlap.
 */
export function createSerialQueue(): <R>(task: () => Promise<R>) => Promise<R> {
  let tail: Promise<unknown> = Promise.resolve();
  return (task) => {
    const run = tail.then(task);
    tail = run.catch(() => undefined);
    return run;
  };
}
