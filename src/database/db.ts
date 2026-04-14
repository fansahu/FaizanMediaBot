import { promises as fs } from "fs";
import path from "path";

export const FREE_DAILY_LIMIT = 10;

export interface UserRecord {
  userId: number;
  username?: string;
  firstName?: string;
  isPremium: boolean;
  dailyDownloads: number;
  lastReset: string;
  totalDownloads: number;
  joinedAt: string;
  isBanned: boolean;
  premiumNote?: string;
}

interface DbData {
  users: Record<string, UserRecord>;
}

const DB_PATH = path.join(process.cwd(), "data", "users.json");

class Database {
  private users: Map<number, UserRecord> = new Map();
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  async init() {
    try {
      await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
      const raw = await fs.readFile(DB_PATH, "utf-8");
      const data: DbData = JSON.parse(raw);
      for (const [id, record] of Object.entries(data.users)) {
        this.users.set(Number(id), record);
      }
      console.log(`✅ Database loaded: ${this.users.size} users`);
    } catch {
      console.log("📦 Fresh database started");
    }
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.persist(), 2000);
  }

  private async persist() {
    const data: DbData = { users: {} };
    for (const [id, record] of this.users) {
      data.users[String(id)] = record;
    }
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
  }

  private today(): string {
    return new Date().toISOString().split("T")[0];
  }

  async getOrCreate(userId: number, username?: string, firstName?: string): Promise<UserRecord> {
    if (!this.users.has(userId)) {
      const user: UserRecord = {
        userId,
        username,
        firstName,
        isPremium: false,
        dailyDownloads: 0,
        lastReset: this.today(),
        totalDownloads: 0,
        joinedAt: new Date().toISOString(),
        isBanned: false,
      };
      this.users.set(userId, user);
      this.scheduleSave();
      return user;
    }

    const user = this.users.get(userId)!;
    if (username) user.username = username;
    if (firstName) user.firstName = firstName;

    if (user.lastReset !== this.today()) {
      user.dailyDownloads = 0;
      user.lastReset = this.today();
      this.scheduleSave();
    }

    return user;
  }

  async canDownload(userId: number): Promise<{ allowed: boolean; remaining: number; isPremium: boolean; isBanned: boolean }> {
    const user = this.users.get(userId);
    if (!user) return { allowed: true, remaining: FREE_DAILY_LIMIT, isPremium: false, isBanned: false };
    if (user.isBanned) return { allowed: false, remaining: 0, isPremium: user.isPremium, isBanned: true };
    if (user.isPremium) return { allowed: true, remaining: 999, isPremium: true, isBanned: false };
    const remaining = FREE_DAILY_LIMIT - user.dailyDownloads;
    return { allowed: remaining > 0, remaining: Math.max(0, remaining), isPremium: false, isBanned: false };
  }

  async recordDownload(userId: number) {
    const user = this.users.get(userId);
    if (!user) return;
    user.dailyDownloads++;
    user.totalDownloads++;
    this.scheduleSave();
  }

  async setPremium(userId: number, isPremium: boolean, note?: string): Promise<UserRecord | null> {
    const user = this.users.get(userId);
    if (!user) return null;
    user.isPremium = isPremium;
    if (note) user.premiumNote = note;
    this.scheduleSave();
    return user;
  }

  async setBan(userId: number, banned: boolean): Promise<UserRecord | null> {
    const user = this.users.get(userId);
    if (!user) return null;
    user.isBanned = banned;
    this.scheduleSave();
    return user;
  }

  getUserById(userId: number): UserRecord | undefined {
    return this.users.get(userId);
  }

  getAllUsers(): UserRecord[] {
    return Array.from(this.users.values());
  }

  getStats() {
    const all = this.getAllUsers();
    const premium = all.filter((u) => u.isPremium).length;
    const banned = all.filter((u) => u.isBanned).length;
    const todayStr = this.today();
    const activeToday = all.filter((u) => u.lastReset === todayStr && u.dailyDownloads > 0).length;
    const totalDownloads = all.reduce((s, u) => s + u.totalDownloads, 0);
    return {
      totalUsers: all.length,
      premiumUsers: premium,
      freeUsers: all.length - premium,
      bannedUsers: banned,
      activeToday,
      totalDownloads,
    };
  }
}

export const db = new Database();
