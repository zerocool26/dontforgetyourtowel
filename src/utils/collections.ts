/**
 * Advanced Collections Utilities
 * @module utils/collections
 * @description High-performance data structures including priority queues,
 * LRU/LFU caches, circular buffers, and more.
 */

// ============================================================================
// Priority Queue (Min-Heap)
// ============================================================================

/**
 * Priority queue item
 */
export interface PriorityItem<T> {
  value: T;
  priority: number;
}

/**
 * Min-Heap based Priority Queue
 */
export class PriorityQueue<T> {
  private heap: PriorityItem<T>[] = [];

  /**
   * Create a new priority queue
   * @param items - Initial items
   */
  constructor(items?: PriorityItem<T>[]) {
    if (items) {
      for (const item of items) {
        this.enqueue(item.value, item.priority);
      }
    }
  }

  /**
   * Get the number of items in the queue
   */
  get size(): number {
    return this.heap.length;
  }

  /**
   * Check if the queue is empty
   */
  get isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Add an item with priority
   * @param value - Value to add
   * @param priority - Priority (lower = higher priority)
   */
  enqueue(value: T, priority: number): void {
    this.heap.push({ value, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Remove and return the highest priority item
   * @returns The item with lowest priority value, or undefined if empty
   */
  dequeue(): T | undefined {
    if (this.isEmpty) return undefined;

    const min = this.heap[0];
    const last = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }

    return min.value;
  }

  /**
   * Peek at the highest priority item without removing
   */
  peek(): T | undefined {
    return this.heap[0]?.value;
  }

  /**
   * Get all items as array (sorted by priority)
   */
  toArray(): T[] {
    const copy = [...this.heap];
    const result: T[] = [];

    const tempQueue = new PriorityQueue<T>();
    tempQueue.heap = copy;

    while (!tempQueue.isEmpty) {
      result.push(tempQueue.dequeue()!);
    }

    return result;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.heap = [];
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].priority <= this.heap[index].priority) break;

      [this.heap[parentIndex], this.heap[index]] = [
        this.heap[index],
        this.heap[parentIndex],
      ];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;

    while (true) {
      let smallest = index;
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;

      if (
        leftChild < length &&
        this.heap[leftChild].priority < this.heap[smallest].priority
      ) {
        smallest = leftChild;
      }

      if (
        rightChild < length &&
        this.heap[rightChild].priority < this.heap[smallest].priority
      ) {
        smallest = rightChild;
      }

      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [
        this.heap[smallest],
        this.heap[index],
      ];
      index = smallest;
    }
  }
}

// ============================================================================
// Max-Heap Priority Queue
// ============================================================================

/**
 * Max-Heap based Priority Queue (higher priority = comes first)
 */
export class MaxPriorityQueue<T> {
  private queue = new PriorityQueue<T>();

  /**
   * Create a new max priority queue
   * @param items - Initial items
   */
  constructor(items?: PriorityItem<T>[]) {
    if (items) {
      for (const item of items) {
        this.enqueue(item.value, item.priority);
      }
    }
  }

  get size(): number {
    return this.queue.size;
  }

  get isEmpty(): boolean {
    return this.queue.isEmpty;
  }

  enqueue(value: T, priority: number): void {
    this.queue.enqueue(value, -priority); // Negate for max behavior
  }

  dequeue(): T | undefined {
    return this.queue.dequeue();
  }

  peek(): T | undefined {
    return this.queue.peek();
  }

  clear(): void {
    this.queue.clear();
  }
}

// ============================================================================
// LRU Cache
// ============================================================================

/**
 * LRU Cache entry
 */
interface LRUNode<K, V> {
  key: K;
  value: V;
  prev: LRUNode<K, V> | null;
  next: LRUNode<K, V> | null;
}

/**
 * Least Recently Used (LRU) Cache
 */
export class LRUCache<K, V> {
  private capacity: number;
  private cache = new Map<K, LRUNode<K, V>>();
  private head: LRUNode<K, V> | null = null;
  private tail: LRUNode<K, V> | null = null;

  /**
   * Create an LRU cache
   * @param capacity - Maximum number of items
   */
  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('Capacity must be positive');
    }
    this.capacity = capacity;
  }

  /**
   * Get current size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get a value from the cache (marks as recently used)
   * @param key - Key to look up
   * @returns Value or undefined if not found
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key);
    if (!node) return undefined;

    this.moveToFront(node);
    return node.value;
  }

  /**
   * Check if key exists (does not mark as recently used)
   * @param key - Key to check
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Set a value in the cache
   * @param key - Key
   * @param value - Value
   */
  set(key: K, value: V): void {
    const existing = this.cache.get(key);

    if (existing) {
      existing.value = value;
      this.moveToFront(existing);
      return;
    }

    const node: LRUNode<K, V> = {
      key,
      value,
      prev: null,
      next: this.head,
    };

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }

    this.cache.set(key, node);

    if (this.cache.size > this.capacity) {
      this.evictLRU();
    }
  }

  /**
   * Delete a key from the cache
   * @param key - Key to delete
   * @returns True if the key existed
   */
  delete(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) return false;

    this.removeNode(node);
    this.cache.delete(key);
    return true;
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  /**
   * Get all keys in order (most recent first)
   */
  keys(): K[] {
    const keys: K[] = [];
    let node = this.head;
    while (node) {
      keys.push(node.key);
      node = node.next;
    }
    return keys;
  }

  /**
   * Get all values in order (most recent first)
   */
  values(): V[] {
    const values: V[] = [];
    let node = this.head;
    while (node) {
      values.push(node.value);
      node = node.next;
    }
    return values;
  }

  /**
   * Get all entries in order (most recent first)
   */
  entries(): [K, V][] {
    const entries: [K, V][] = [];
    let node = this.head;
    while (node) {
      entries.push([node.key, node.value]);
      node = node.next;
    }
    return entries;
  }

  private moveToFront(node: LRUNode<K, V>): void {
    if (node === this.head) return;

    this.removeNode(node);

    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private evictLRU(): void {
    if (!this.tail) return;

    this.cache.delete(this.tail.key);
    this.removeNode(this.tail);
  }
}

// ============================================================================
// LFU Cache
// ============================================================================

/**
 * Least Frequently Used (LFU) Cache
 */
export class LFUCache<K, V> {
  private capacity: number;
  private cache = new Map<K, { value: V; freq: number }>();
  private freqMap = new Map<number, Set<K>>();
  private minFreq = 0;

  /**
   * Create an LFU cache
   * @param capacity - Maximum number of items
   */
  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('Capacity must be positive');
    }
    this.capacity = capacity;
  }

  /**
   * Get current size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get a value from the cache
   * @param key - Key to look up
   * @returns Value or undefined if not found
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    this.updateFrequency(key, entry.freq);
    return entry.value;
  }

  /**
   * Check if key exists
   * @param key - Key to check
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Set a value in the cache
   * @param key - Key
   * @param value - Value
   */
  set(key: K, value: V): void {
    if (this.capacity === 0) return;

    const existing = this.cache.get(key);

    if (existing) {
      existing.value = value;
      this.updateFrequency(key, existing.freq);
      return;
    }

    if (this.cache.size >= this.capacity) {
      this.evictLFU();
    }

    this.cache.set(key, { value, freq: 1 });

    if (!this.freqMap.has(1)) {
      this.freqMap.set(1, new Set());
    }
    this.freqMap.get(1)!.add(key);
    this.minFreq = 1;
  }

  /**
   * Delete a key from the cache
   * @param key - Key to delete
   * @returns True if the key existed
   */
  delete(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.freqMap.get(entry.freq)?.delete(key);
    this.cache.delete(key);
    return true;
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
    this.freqMap.clear();
    this.minFreq = 0;
  }

  private updateFrequency(key: K, oldFreq: number): void {
    const entry = this.cache.get(key);
    if (!entry) return;

    this.freqMap.get(oldFreq)?.delete(key);

    if (this.freqMap.get(oldFreq)?.size === 0) {
      this.freqMap.delete(oldFreq);
      if (this.minFreq === oldFreq) {
        this.minFreq++;
      }
    }

    const newFreq = oldFreq + 1;
    entry.freq = newFreq;

    if (!this.freqMap.has(newFreq)) {
      this.freqMap.set(newFreq, new Set());
    }
    this.freqMap.get(newFreq)!.add(key);
  }

  private evictLFU(): void {
    const keys = this.freqMap.get(this.minFreq);
    if (!keys || keys.size === 0) return;

    const next = keys.values().next();
    if (next.done) return;

    const keyToEvict = next.value;
    keys.delete(keyToEvict);

    if (keys.size === 0) {
      this.freqMap.delete(this.minFreq);
    }

    this.cache.delete(keyToEvict);
  }
}

// ============================================================================
// Circular Buffer (Ring Buffer)
// ============================================================================

/**
 * Fixed-size Circular Buffer
 */
export class CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private _size = 0;
  private capacity: number;

  /**
   * Create a circular buffer
   * @param capacity - Maximum number of items
   */
  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('Capacity must be positive');
    }
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /**
   * Get current size
   */
  get size(): number {
    return this._size;
  }

  /**
   * Check if buffer is full
   */
  get isFull(): boolean {
    return this._size === this.capacity;
  }

  /**
   * Check if buffer is empty
   */
  get isEmpty(): boolean {
    return this._size === 0;
  }

  /**
   * Push an item to the buffer (overwrites oldest if full)
   * @param item - Item to push
   * @returns Overwritten item if any
   */
  push(item: T): T | undefined {
    const writeIndex = (this.head + this._size) % this.capacity;
    const overwritten = this.isFull ? this.buffer[writeIndex] : undefined;

    this.buffer[writeIndex] = item;

    if (this.isFull) {
      this.head = (this.head + 1) % this.capacity;
    } else {
      this._size++;
    }

    return overwritten;
  }

  /**
   * Pop the oldest item from the buffer
   * @returns Oldest item or undefined if empty
   */
  shift(): T | undefined {
    if (this.isEmpty) return undefined;

    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined;
    this.head = (this.head + 1) % this.capacity;
    this._size--;

    return item;
  }

  /**
   * Peek at oldest item without removing
   */
  peek(): T | undefined {
    if (this.isEmpty) return undefined;
    return this.buffer[this.head];
  }

  /**
   * Peek at newest item without removing
   */
  peekLast(): T | undefined {
    if (this.isEmpty) return undefined;
    const index = (this.head + this._size - 1) % this.capacity;
    return this.buffer[index];
  }

  /**
   * Get item at index (0 = oldest)
   * @param index - Index from oldest
   */
  at(index: number): T | undefined {
    if (index < 0 || index >= this._size) return undefined;
    return this.buffer[(this.head + index) % this.capacity];
  }

  /**
   * Convert to array (oldest first)
   */
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this._size; i++) {
      result.push(this.buffer[(this.head + i) % this.capacity] as T);
    }
    return result;
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this._size = 0;
  }
}

// ============================================================================
// Deque (Double-Ended Queue)
// ============================================================================

/**
 * Deque node
 */
interface DequeNode<T> {
  value: T;
  prev: DequeNode<T> | null;
  next: DequeNode<T> | null;
}

/**
 * Double-Ended Queue
 */
export class Deque<T> {
  private head: DequeNode<T> | null = null;
  private tail: DequeNode<T> | null = null;
  private _size = 0;

  /**
   * Get current size
   */
  get size(): number {
    return this._size;
  }

  /**
   * Check if deque is empty
   */
  get isEmpty(): boolean {
    return this._size === 0;
  }

  /**
   * Add item to front
   * @param value - Value to add
   */
  pushFront(value: T): void {
    const node: DequeNode<T> = { value, prev: null, next: this.head };

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }

    this._size++;
  }

  /**
   * Add item to back
   * @param value - Value to add
   */
  pushBack(value: T): void {
    const node: DequeNode<T> = { value, prev: this.tail, next: null };

    if (this.tail) {
      this.tail.next = node;
    }
    this.tail = node;

    if (!this.head) {
      this.head = node;
    }

    this._size++;
  }

  /**
   * Remove and return item from front
   */
  popFront(): T | undefined {
    if (!this.head) return undefined;

    const value = this.head.value;
    this.head = this.head.next;

    if (this.head) {
      this.head.prev = null;
    } else {
      this.tail = null;
    }

    this._size--;
    return value;
  }

  /**
   * Remove and return item from back
   */
  popBack(): T | undefined {
    if (!this.tail) return undefined;

    const value = this.tail.value;
    this.tail = this.tail.prev;

    if (this.tail) {
      this.tail.next = null;
    } else {
      this.head = null;
    }

    this._size--;
    return value;
  }

  /**
   * Peek at front item
   */
  peekFront(): T | undefined {
    return this.head?.value;
  }

  /**
   * Peek at back item
   */
  peekBack(): T | undefined {
    return this.tail?.value;
  }

  /**
   * Convert to array (front to back)
   */
  toArray(): T[] {
    const result: T[] = [];
    let node = this.head;
    while (node) {
      result.push(node.value);
      node = node.next;
    }
    return result;
  }

  /**
   * Clear the deque
   */
  clear(): void {
    this.head = null;
    this.tail = null;
    this._size = 0;
  }
}

// ============================================================================
// Bloom Filter
// ============================================================================

/**
 * Probabilistic Bloom Filter for set membership testing
 */
export class BloomFilter {
  private bits: Uint8Array;
  private numHashes: number;
  private size: number;

  /**
   * Create a bloom filter
   * @param expectedItems - Expected number of items
   * @param falsePositiveRate - Desired false positive rate (0-1)
   */
  constructor(expectedItems: number, falsePositiveRate = 0.01) {
    // Calculate optimal size and hash count
    this.size = Math.ceil(
      -(expectedItems * Math.log(falsePositiveRate)) / Math.log(2) ** 2
    );
    this.numHashes = Math.ceil((this.size / expectedItems) * Math.log(2));
    this.bits = new Uint8Array(Math.ceil(this.size / 8));
  }

  /**
   * Add a value to the filter
   * @param value - Value to add (will be converted to string)
   */
  add(value: unknown): void {
    const str = String(value);
    for (let i = 0; i < this.numHashes; i++) {
      const hash = this.hash(str, i);
      const index = hash % this.size;
      this.bits[Math.floor(index / 8)] |= 1 << (index % 8);
    }
  }

  /**
   * Check if a value might be in the filter
   * @param value - Value to check
   * @returns False = definitely not in set, True = probably in set
   */
  mightContain(value: unknown): boolean {
    const str = String(value);
    for (let i = 0; i < this.numHashes; i++) {
      const hash = this.hash(str, i);
      const index = hash % this.size;
      if ((this.bits[Math.floor(index / 8)] & (1 << (index % 8))) === 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get estimated fill ratio
   */
  getFillRatio(): number {
    let setBits = 0;
    for (let i = 0; i < this.bits.length; i++) {
      let byte = this.bits[i];
      while (byte) {
        setBits += byte & 1;
        byte >>= 1;
      }
    }
    return setBits / this.size;
  }

  private hash(str: string, seed: number): number {
    // FNV-1a hash with seed
    let hash = 2166136261 ^ seed;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash);
  }
}

// ============================================================================
// Trie (Prefix Tree)
// ============================================================================

/**
 * Trie node
 */
interface TrieNode<T> {
  children: Map<string, TrieNode<T>>;
  isEnd: boolean;
  value?: T;
}

/**
 * Trie (Prefix Tree) for efficient string operations
 */
export class Trie<T = boolean> {
  private root: TrieNode<T> = { children: new Map(), isEnd: false };
  private _size = 0;

  /**
   * Get number of entries
   */
  get size(): number {
    return this._size;
  }

  /**
   * Insert a word with optional value
   * @param word - Word to insert
   * @param value - Optional value to associate
   */
  insert(word: string, value?: T): void {
    let node = this.root;

    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, { children: new Map(), isEnd: false });
      }
      node = node.children.get(char)!;
    }

    if (!node.isEnd) {
      this._size++;
    }
    node.isEnd = true;
    node.value = value;
  }

  /**
   * Check if word exists in trie
   * @param word - Word to search
   */
  has(word: string): boolean {
    const node = this.findNode(word);
    return node !== null && node.isEnd;
  }

  /**
   * Get value associated with word
   * @param word - Word to look up
   */
  get(word: string): T | undefined {
    const node = this.findNode(word);
    return node?.isEnd ? node.value : undefined;
  }

  /**
   * Check if any word starts with prefix
   * @param prefix - Prefix to check
   */
  hasPrefix(prefix: string): boolean {
    return this.findNode(prefix) !== null;
  }

  /**
   * Get all words with given prefix
   * @param prefix - Prefix to search
   * @param limit - Maximum results
   */
  getWordsWithPrefix(prefix: string, limit = Infinity): string[] {
    const node = this.findNode(prefix);
    if (!node) return [];

    const results: string[] = [];
    this.collectWords(node, prefix, results, limit);
    return results;
  }

  /**
   * Delete a word from trie
   * @param word - Word to delete
   * @returns True if word existed
   */
  delete(word: string): boolean {
    const node = this.findNode(word);
    if (!node || !node.isEnd) return false;

    node.isEnd = false;
    node.value = undefined;
    this._size--;

    // Clean up empty branches
    this.cleanupBranch(word);
    return true;
  }

  /**
   * Get all words in the trie
   */
  getAllWords(): string[] {
    const results: string[] = [];
    this.collectWords(this.root, '', results, Infinity);
    return results;
  }

  /**
   * Clear the trie
   */
  clear(): void {
    this.root = { children: new Map(), isEnd: false };
    this._size = 0;
  }

  private findNode(word: string): TrieNode<T> | null {
    let node = this.root;

    for (const char of word) {
      if (!node.children.has(char)) {
        return null;
      }
      node = node.children.get(char)!;
    }

    return node;
  }

  private collectWords(
    node: TrieNode<T>,
    prefix: string,
    results: string[],
    limit: number
  ): void {
    if (results.length >= limit) return;

    if (node.isEnd) {
      results.push(prefix);
    }

    for (const [char, child] of node.children) {
      this.collectWords(child, prefix + char, results, limit);
    }
  }

  private cleanupBranch(word: string): void {
    // Walk down and clean up empty nodes from the bottom up
    const path: Array<{ node: TrieNode<T>; char: string }> = [];
    let node = this.root;

    for (const char of word) {
      const child = node.children.get(char);
      if (!child) return;
      path.push({ node, char });
      node = child;
    }

    // Walk back up and delete empty nodes
    for (let i = path.length - 1; i >= 0; i--) {
      const { node: parent, char } = path[i];
      const child = parent.children.get(char);
      if (child && !child.isEnd && child.children.size === 0) {
        parent.children.delete(char);
      } else {
        break;
      }
    }
  }

  private deleteHelper(
    node: TrieNode<T>,
    word: string,
    index: number
  ): boolean {
    if (index === word.length) {
      if (!node.isEnd) return false;
      node.isEnd = false;
      node.value = undefined;
      this._size--;
      return node.children.size === 0;
    }

    const char = word[index];
    const child = node.children.get(char);
    if (!child) return false;

    const shouldDeleteChild = this.deleteHelper(child, word, index + 1);

    if (shouldDeleteChild) {
      node.children.delete(char);
      return !node.isEnd && node.children.size === 0;
    }

    return false;
  }
}

// ============================================================================
// Disjoint Set (Union-Find)
// ============================================================================

/**
 * Disjoint Set (Union-Find) data structure
 */
export class DisjointSet<T> {
  private parent = new Map<T, T>();
  private rank = new Map<T, number>();

  /**
   * Make a new set with single element
   * @param x - Element to add
   */
  makeSet(x: T): void {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
  }

  /**
   * Find the representative of the set containing x
   * @param x - Element to find
   * @returns Representative element
   */
  find(x: T): T {
    if (!this.parent.has(x)) {
      this.makeSet(x);
    }

    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!)); // Path compression
    }

    return this.parent.get(x)!;
  }

  /**
   * Union two sets
   * @param x - First element
   * @param y - Second element
   * @returns True if union was performed (sets were different)
   */
  union(x: T, y: T): boolean {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) return false;

    const rankX = this.rank.get(rootX)!;
    const rankY = this.rank.get(rootY)!;

    if (rankX < rankY) {
      this.parent.set(rootX, rootY);
    } else if (rankX > rankY) {
      this.parent.set(rootY, rootX);
    } else {
      this.parent.set(rootY, rootX);
      this.rank.set(rootX, rankX + 1);
    }

    return true;
  }

  /**
   * Check if two elements are in the same set
   * @param x - First element
   * @param y - Second element
   */
  connected(x: T, y: T): boolean {
    return this.find(x) === this.find(y);
  }

  /**
   * Get all unique sets
   */
  getSets(): Map<T, T[]> {
    const sets = new Map<T, T[]>();

    for (const x of this.parent.keys()) {
      const root = this.find(x);
      if (!sets.has(root)) {
        sets.set(root, []);
      }
      sets.get(root)!.push(x);
    }

    return sets;
  }
}

// ============================================================================
// Interval Tree
// ============================================================================

/**
 * Interval
 */
export interface Interval {
  start: number;
  end: number;
}

/**
 * Interval with associated data
 */
export interface IntervalData<T> extends Interval {
  data: T;
}

/**
 * Interval Tree node
 */
interface IntervalNode<T> {
  interval: IntervalData<T>;
  max: number;
  left: IntervalNode<T> | null;
  right: IntervalNode<T> | null;
}

/**
 * Interval Tree for efficient interval queries
 */
export class IntervalTree<T> {
  private root: IntervalNode<T> | null = null;

  /**
   * Insert an interval
   * @param start - Start of interval
   * @param end - End of interval
   * @param data - Associated data
   */
  insert(start: number, end: number, data: T): void {
    const interval: IntervalData<T> = { start, end, data };
    this.root = this.insertNode(this.root, interval);
  }

  /**
   * Find all intervals overlapping with given interval
   * @param start - Query start
   * @param end - Query end
   */
  queryOverlapping(start: number, end: number): IntervalData<T>[] {
    const results: IntervalData<T>[] = [];
    this.searchOverlapping(this.root, start, end, results);
    return results;
  }

  /**
   * Find all intervals containing a point
   * @param point - Point to query
   */
  queryPoint(point: number): IntervalData<T>[] {
    return this.queryOverlapping(point, point);
  }

  private insertNode(
    node: IntervalNode<T> | null,
    interval: IntervalData<T>
  ): IntervalNode<T> {
    if (!node) {
      return {
        interval,
        max: interval.end,
        left: null,
        right: null,
      };
    }

    if (interval.start < node.interval.start) {
      node.left = this.insertNode(node.left, interval);
    } else {
      node.right = this.insertNode(node.right, interval);
    }

    node.max = Math.max(node.max, interval.end);
    return node;
  }

  private searchOverlapping(
    node: IntervalNode<T> | null,
    start: number,
    end: number,
    results: IntervalData<T>[]
  ): void {
    if (!node) return;

    // Check if this interval overlaps
    if (node.interval.start <= end && node.interval.end >= start) {
      results.push(node.interval);
    }

    // Search left subtree if it might contain overlapping intervals
    if (node.left && node.left.max >= start) {
      this.searchOverlapping(node.left, start, end, results);
    }

    // Search right subtree if it might contain overlapping intervals
    if (node.right && node.interval.start <= end) {
      this.searchOverlapping(node.right, start, end, results);
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a memoized version of a function with LRU cache
 * @param fn - Function to memoize
 * @param capacity - Cache capacity
 * @param keyFn - Function to generate cache key
 */
export function memoizeWithLRU<T extends (...args: unknown[]) => unknown>(
  fn: T,
  capacity = 100,
  keyFn?: (...args: Parameters<T>) => string
): T {
  const cache = new LRUCache<string, ReturnType<T>>(capacity);

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    const cached = cache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const result = fn(...args) as ReturnType<T>;
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Create a sliding window over an array
 * @param arr - Array to window
 * @param windowSize - Size of window
 */
export function* slidingWindow<T>(
  arr: T[],
  windowSize: number
): Generator<T[], void, unknown> {
  if (windowSize <= 0 || windowSize > arr.length) return;

  const buffer = new CircularBuffer<T>(windowSize);

  for (let i = 0; i < windowSize; i++) {
    buffer.push(arr[i]);
  }
  yield buffer.toArray();

  for (let i = windowSize; i < arr.length; i++) {
    buffer.shift();
    buffer.push(arr[i]);
    yield buffer.toArray();
  }
}

/**
 * Create a moving average calculator
 * @param windowSize - Size of the moving window
 */
export function createMovingAverage(windowSize: number): {
  add: (value: number) => number;
  getAverage: () => number;
  clear: () => void;
} {
  const buffer = new CircularBuffer<number>(windowSize);
  let sum = 0;

  return {
    add(value: number): number {
      const removed = buffer.push(value);
      if (removed !== undefined) {
        sum -= removed;
      }
      sum += value;
      return sum / buffer.size;
    },
    getAverage(): number {
      return buffer.isEmpty ? 0 : sum / buffer.size;
    },
    clear(): void {
      buffer.clear();
      sum = 0;
    },
  };
}
