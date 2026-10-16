import { describe, expect, it } from "vitest";

import { createSerialQueue, forEachConcurrent } from "../pool";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("forEachConcurrent", () => {
  it("visits every item once and never exceeds the concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;
    const seen: number[] = [];
    await forEachConcurrent([5, 1, 4, 2, 3, 1, 2], 3, async (ms, index) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await sleep(ms);
      seen.push(index);
      active--;
    });
    expect(seen.sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(maxActive).toBe(3);
  });

  it("handles fewer items than lanes and empty input", async () => {
    const seen: string[] = [];
    await forEachConcurrent(["a"], 8, async (item) => {
      seen.push(item);
    });
    await forEachConcurrent([], 2, async () => {
      throw new Error("never called");
    });
    expect(seen).toEqual(["a"]);
  });

  it("rejects an invalid concurrency", async () => {
    await expect(forEachConcurrent([1], 0, async () => {})).rejects.toThrow(RangeError);
  });
});

describe("createSerialQueue", () => {
  it("runs tasks one at a time in enqueue order, even from concurrent callers", async () => {
    const enqueue = createSerialQueue();
    const log: string[] = [];
    let active = 0;
    const task = (name: string, ms: number) =>
      enqueue(async () => {
        active++;
        expect(active).toBe(1);
        log.push(`start ${name}`);
        await sleep(ms);
        log.push(`end ${name}`);
        active--;
        return name;
      });
    const results = await Promise.all([task("a", 5), task("b", 1), task("c", 3)]);
    expect(results).toEqual(["a", "b", "c"]);
    expect(log).toEqual(["start a", "end a", "start b", "end b", "start c", "end c"]);
  });

  it("keeps going after a failed task", async () => {
    const enqueue = createSerialQueue();
    await expect(enqueue(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    await expect(enqueue(async () => 42)).resolves.toBe(42);
  });
});
