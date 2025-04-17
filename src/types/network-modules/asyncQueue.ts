export class AsyncQueue<T> {
  // Queue to hold items that are pushed.
  private queue: T[] = [];
  // Queue to hold resolve functions for promises created by pop().
  private resolveQueue: ((value: T) => void)[] = [];

  push(item: T) {
    if (this.resolveQueue.length > 0) {
      const resolve = this.resolveQueue.shift();
      if (resolve) {
        resolve(item);
      }
    } else {
      this.queue.push(item);
    }
  }

  // TODO: add timeouts
  pop(): Promise<T> {
    if (!this.isEmpty()) {
      return Promise.resolve(this.queue.shift()!);
    }
    return new Promise((resolve) => {
      this.resolveQueue.push(resolve);
    });
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
