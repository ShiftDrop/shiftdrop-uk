import Dexie, { Table } from 'dexie';

export interface ShiftItem {
  id?: number;
  title: string;
  date: string;
  status: string;
  synced: boolean;
}

export class AppDatabase extends Dexie {
  shifts!: Table<ShiftItem, number>;

  constructor() {
    super('ShiftDropLocalDB');
    this.version(1).stores({
      shifts: '++id, date, synced'
    });
  }
}

export const db = new AppDatabase();