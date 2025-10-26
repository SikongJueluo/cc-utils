export class Node<T> {
  public value: T;
  public next?: Node<T>;
  public prev?: Node<T>;

  constructor(value: T, next?: Node<T>, prev?: Node<T>) {
    this.value = value;
    this.next = next;
    this.prev = prev;
  }
}

export class Queue<T> {
  private _head?: Node<T>;
  private _tail?: Node<T>;
  private _size: number;

  constructor(data?: T[]) {
    this._head = undefined;
    this._tail = undefined;
    this._size = 0;

    if (data === undefined) return;
    for (const item of data) {
      this.enqueue(item);
    }
  }

  public enqueue(data: T | T[]): void {
    if (Array.isArray(data)) {
      for (const val of data) {
        this.enqueue(val);
      }
      return;
    }

    const node = new Node(data);

    if (this._head === undefined) {
      this._head = node;
      this._tail = node;
    } else {
      this._tail!.next = node;
      node.prev = this._tail;
      this._tail = node;
    }

    this._size++;
  }

  public dequeue(): T | undefined {
    if (this._head === undefined) return undefined;
    const node = this._head;

    this._head = node.next;
    if (this._head !== undefined) this._head.prev = undefined;
    this._size--;

    return node.value;
  }

  public clear(): void {
    this._head = undefined;
    this._tail = undefined;
    this._size = 0;
  }

  public peek(): T | undefined {
    if (this._head === undefined) return undefined;
    return this._head.value;
  }

  public size(): number {
    return this._size;
  }

  public toArray(): T[] | undefined {
    if (this._size === 0) return undefined;

    const array: T[] = [];
    let currentNode: Node<T> = this._head!;
    for (let i = 0; i < this._size; i++) {
      if (currentNode.value !== undefined) array.push(currentNode.value);

      currentNode = currentNode.next!;
    }
    return array;
  }

  [Symbol.iterator](): Iterator<T> {
    let currentNode = this._head;

    return {
      next(): IteratorResult<T> {
        if (currentNode === undefined) {
          return { value: undefined, done: true };
        } else {
          const data = currentNode.value;
          currentNode = currentNode.next;
          return { value: data, done: false };
        }
      },
    };
  }
}
