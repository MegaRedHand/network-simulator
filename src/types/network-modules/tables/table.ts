export interface EntryData {
  [key: string]: string | number | boolean | undefined;
  edited?: boolean;
}

export class Table<T extends EntryData> {
  private dataMap: Map<string, T>;
  private keyField: keyof T;

  constructor(keyField: keyof T, entries?: T[]) {
    this.dataMap = new Map();
    this.keyField = keyField;
    if (entries) {
      entries.forEach((entry) => {
        this.add(entry);
      });
    }
  }

  // Adds or edits an entry (by primary key)
  add(entry: T) {
    const key = String(entry[this.keyField]);
    this.dataMap.set(key, entry);
  }

  // Gets an entry by key
  get(key: string): T | undefined {
    const entry = this.dataMap.get(key);
    return entry;
  }

  // Edits an entry (allows changing the key)
  edit(key: string, changes: Partial<T>) {
    const entry = this.dataMap.get(key);
    if (entry) {
      const keyField = this.keyField as string;
      const newKey =
        changes[keyField] !== undefined ? String(changes[keyField]) : key;

      if (newKey !== key) {
        // If the key changes, remove the old one and add the new one
        const newEntry = { ...entry, ...changes, edited: true };
        this.dataMap.delete(key);
        this.dataMap.set(newKey, newEntry as T);
      } else {
        // If the key does not change, just update the entry
        Object.assign(entry, changes);
        entry.edited = true;
        this.dataMap.set(key, entry);
      }
    } else {
      console.log(`[Table] Tried to edit non-existent entry with key=${key}`);
    }
  }

  // Serializes to array for saving/exporting
  serialize<U = T>(mapper: (entry: T) => U): U[] {
    const result = Array.from(this.dataMap.values()).map(mapper);
    return result;
  }

  // Returns all entries
  all(): T[] {
    const allEntries = Array.from(this.dataMap.values());
    return allEntries;
  }

  // Removes an entry
  remove(key: string) {
    this.dataMap.delete(key);
  }

  // Clears all entries
  clear() {
    this.dataMap.clear();
  }
}
