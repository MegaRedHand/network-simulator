export interface EntryData {
  [key: string]: string | number | boolean | undefined;
  edited?: boolean;
  deleted?: boolean;
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

  // Edits an entry
  edit(key: string, changes: Partial<T>, markEdited = true) {
    const entry = this.dataMap.get(key);
    if (entry) {
      const keyField = this.keyField as string;
      const newKey =
        changes[keyField] !== undefined ? String(changes[keyField]) : key;

      if (newKey !== key) {
        // soft delete
        const deletedEntry = { ...entry, deleted: true, edited: true };
        this.dataMap.set(key, deletedEntry as T);
        console.log(
          `[Table] Entry with key=${key} changed to new key=${newKey}. Marking old entry as deleted.`,
        );

        // create a new entry with the new key
        const newEntry = { ...entry, ...changes, deleted: false, edited: true };
        this.dataMap.set(newKey, newEntry as T);
      } else {
        // if the key didn't change, just update the entry
        Object.assign(entry, changes);
        if (markEdited) entry.edited = true;
        this.dataMap.set(key, entry);
      }
    } else {
      console.log(`[Table] Tried to edit non-existent entry with key=${key}`);
    }
    console.log("[Table] Current entries:", Array.from(this.dataMap.values()));
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

  // Returns all entries that are not marked as deleted
  allActive(): T[] {
    return Array.from(this.dataMap.values()).filter((entry) => !entry.deleted);
  }

  // Returns all entries that are marked as deleted or edited
  allEditedOrDeleted(): T[] {
    return Array.from(this.dataMap.values()).filter(
      (entry) => entry.edited || entry.deleted,
    );
  }

  // Returns all entries that are marked as edited (but not deleted)
  allEdited(): T[] {
    return Array.from(this.dataMap.values()).filter(
      (entry) => entry.edited && !entry.deleted,
    );
  }

  // Returns all entries that are marked as deleted
  allDeleted(): T[] {
    return Array.from(this.dataMap.values()).filter((entry) => entry.deleted);
  }

  // Marks an entry as deleted instead of removing it
  softRemove(key: string) {
    const entry = this.dataMap.get(key);
    if (entry) {
      entry.deleted = true;
      entry.edited = true;
      this.dataMap.set(key, entry);
    }
    console.log(`[Table] Marked entry with key=${key} as deleted.`);
  }

  // Clears all entries
  clear() {
    this.dataMap.clear();
  }
}
