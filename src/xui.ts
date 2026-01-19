import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

export interface XUIConfig {
  baseURL: string;
  username: string;
  password: string;
}

export interface Inbound {
  id: number;
  port: number;
  protocol: string;
  settings: string;
  tag: string;
  remark: string;
  up: number;
  down: number;
  total: number;
  expiryTime: number;
  [key: string]: any;
}

export class XUIClient {
  public readonly axiosInstance: AxiosInstance;
  private cookieJar: CookieJar;
  private isAuthenticated: boolean = false;

  constructor(private config: XUIConfig) {
    this.cookieJar = new CookieJar();
    const instance = axios.create({
      baseURL: config.baseURL,
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' },
    });
    this.axiosInstance = wrapper(instance) as AxiosInstance;
    (this.axiosInstance.defaults as any).jar = this.cookieJar;
  }

  async login(): Promise<boolean> {
    try {
      this.cookieJar.removeAllCookies();
      const response = await this.axiosInstance.post('/login', {
        username: this.config.username,
        password: this.config.password,
      });
      this.isAuthenticated = response.status === 200;
      return this.isAuthenticated;
    } catch {
      return false;
    }
  }

  async getInbounds(): Promise<Inbound[]> {
    if (!this.isAuthenticated) await this.login();
    const response = await this.axiosInstance.get('/panel/api/inbounds/list');
    return response.data.obj || [];
  }

  async findUserByTelegramId(tgId: number): Promise<{ inbound: Inbound; client: any } | null> {
    const inbounds = await this.getInbounds();
    for (const inbound of inbounds) {
      try {
        const settings = JSON.parse(inbound.settings);
        const client = settings.clients.find((c: any) => c.tgId === tgId || c.email === `tg_${tgId}`);
        if (client) return { inbound, client };
      } catch { continue; }
    }
    return null;
  }

  async createUser(inboundId: number, tgId: number, days: number): Promise<string> {
    const uuid = this.generateUUID();
    const expiryTimestamp = Date.now() + days * 24 * 60 * 60 * 1000;
    
    // ВАЖНО: 3X-UI требует объект клиента внутри JSON строки в поле settings
    const clientData = {
      id: uuid,
      email: `tg_${tgId}`,
      limitIp: 1,
      totalGB: 0,
      expiryTime: expiryTimestamp,
      enable: true,
      tgId: tgId,
      subId: this.generateUUID().substring(0, 8),
      flow: ""
    };

    const response = await this.axiosInstance.post('/panel/api/inbounds/addClient', {
      id: inboundId,
      settings: JSON.stringify({ clients: [clientData] })
    });

    if (!response.data.success) {
      throw new Error(response.data.msg || 'Failed to add client');
    }

    return uuid;
  }

  async getClientStats(email: string): Promise<{ up: number, down: number } | null> {
    if (!this.isAuthenticated) await this.login();
    const response = await this.axiosInstance.get(`/panel/api/inbounds/getClientTraffics/${email}`);
    if (response.data.success && response.data.obj) {
      return {
        up: response.data.obj.up,
        down: response.data.obj.down
      };
    }
    return null;
  }

  async updateUserExpiry(inboundId: number, clientUuid: string, tgId: number, days: number): Promise<void> {
    const user = await this.findUserByTelegramId(tgId);
    let baseTime = Date.now();
    
    if (user && user.client.expiryTime > baseTime) {
      baseTime = user.client.expiryTime;
    }

    const newExpiry = baseTime + days * 24 * 60 * 60 * 1000;

    const clientData = {
      id: clientUuid,
      email: `tg_${tgId}`,
      expiryTime: newExpiry,
      enable: true,
      tgId: tgId
    };

    const response = await this.axiosInstance.post(`/panel/api/inbounds/updateClient/${clientUuid}`, {
      id: inboundId,
      settings: JSON.stringify({ clients: [clientData] })
    });

    if (!response.data.success) throw new Error(response.data.msg);
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
}