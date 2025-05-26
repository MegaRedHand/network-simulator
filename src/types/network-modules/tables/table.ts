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
    console.log("[Table] Constructor initialized with entries:", this.all());
  }

  // Agrega o edita una entrada (por clave principal)
  add(entry: T) {
    const key = String(entry[this.keyField]);
    this.dataMap.set(key, entry);
    console.log(`[Table] Added/Updated entry with key=${key}:`, entry);
  }

  // Obtiene una entrada por clave
  get(key: string): T | undefined {
    const entry = this.dataMap.get(key);
    console.log(`[Table] Get entry with key=${key}:`, entry);
    return entry;
  }

  // Edita una entrada (solo los campos pasados)
  edit(key: string, changes: Partial<T>) {
    const entry = this.dataMap.get(key);
    if (entry) {
      Object.assign(entry, changes);
      entry.edited = true;
      this.dataMap.set(key, entry);
      console.log(`[Table] Edited entry with key=${key}:`, entry);
    } else {
      console.log(`[Table] Tried to edit non-existent entry with key=${key}`);
    }
  }

  // Serializa a array para guardar/exportar
  serialize<U = T>(mapper: (entry: T) => U): U[] {
    const result = Array.from(this.dataMap.values()).map(mapper);
    console.log("[Table] Serialized entries:", result);
    return result;
  }

  // Devuelve todas las entradas
  all(): T[] {
    const allEntries = Array.from(this.dataMap.values());
    console.log("[Table] All entries:", allEntries);
    return allEntries;
  }

  // Elimina una entrada
  remove(key: string) {
    const existed = this.dataMap.delete(key);
    console.log(`[Table] Removed entry with key=${key}:`, existed);
  }

  // Limpia todas las entradas
  clear() {
    this.dataMap.clear();
    console.log("[Table] Cleared all entries");
  }
}
