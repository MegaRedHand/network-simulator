export class AsyncQueue<T> {
  // Queue to hold items that are pushed.
  private queue: T[] = [];
  // Queue to hold resolve functions for promises created by pop().
  private resolveQueue: ((value: T) => void)[] = [];
  // Flag to indicate if the queue is closed.
  private closed = false;

  /**
   * Pushes an item onto the queue.
   * @param item The item to push.
   * @returns true if the item was pushed, false if the queue is closed.
   */
  push(item: T): boolean {
    if (this.closed) {
      return false;
    } else if (this.resolveQueue.length > 0) {
      const resolve = this.resolveQueue.shift();
      if (resolve) {
        resolve(item);
      }
    } else {
      this.queue.push(item);
    }
    return true;
  }

  /**
   * Pops an item from the queue.
   * @returns A promise that resolves to the popped item, or undefined if the queue was closed.
   */
  pop(): Promise<T | undefined> {
    if (!this.isEmpty()) {
      return Promise.resolve(this.queue.shift());
    }
    if (this.closed) {
      return Promise.resolve(undefined);
    }
    return new Promise((resolve) => {
      this.resolveQueue.push(resolve);
    });
  }

  close() {
    this.closed = true;
    while (this.resolveQueue.length > 0) {
      const resolve = this.resolveQueue.shift();
      if (resolve) {
        resolve(undefined);
      }
    }
  }

  isClosed(): boolean {
    return this.closed;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
