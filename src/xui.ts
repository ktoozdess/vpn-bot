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
  streamSettings: string;
  tag: string;
  sniffing: string;
  remark: string;
  up: number;
  down: number;
  total: number;
  expiryTime: number;
  listen: string;
  client?: {
    uuid: string;
  };
  [key: string]: unknown;
}

export interface InboundsListResponse {
  success: boolean;
  obj: Inbound[];
}

/**
 * 3X-UI API Client with session-based authentication
 */
export class XUIClient {
  private axiosInstance: AxiosInstance;
  private config: XUIConfig;
  private cookieJar: CookieJar;
  private isAuthenticated: boolean = false;

  constructor(config: XUIConfig) {
    this.config = config;
    this.cookieJar = new CookieJar();
    
    // Create axios instance
    const axiosInstance = axios.create({
      baseURL: config.baseURL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Wrap axios instance with cookie jar support
    // The wrapper adds an interceptor that uses config.jar for each request
    this.axiosInstance = wrapper(axiosInstance) as AxiosInstance;
    
    // Set default jar for all requests
    (this.axiosInstance.defaults as unknown as { jar?: CookieJar }).jar = this.cookieJar;
  }

  /**
   * Login to 3X-UI and establish session
   */
  async login(): Promise<boolean> {
    try {
      // Clear existing cookies before login
      this.cookieJar.removeAllCookies();
      this.isAuthenticated = false;

      const response: AxiosResponse = await this.axiosInstance.post(
        '/login',
        {
          username: this.config.username,
          password: this.config.password,
        }
      );

      // Check if login was successful
      // 3X-UI typically returns success: true or a redirect
      if (response.status === 200) {
        // Check if cookies were set (cookie jar handles this automatically)
        const cookies = await this.cookieJar.getCookies(this.config.baseURL);
        if (cookies.length > 0) {
          // Cookies are stored in jar, authentication successful
          this.isAuthenticated = true;
          return true;
        }
        // Some 3X-UI versions return success in body
        if (response.data?.success === true) {
          this.isAuthenticated = true;
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      this.isAuthenticated = false;
      return false;
    }
  }

  /**
   * Get list of inbounds
   */
  async getInbounds(): Promise<Inbound[]> {
    if (!this.isAuthenticated) {
      const loggedIn = await this.login();
      if (!loggedIn) {
        throw new Error('Not authenticated. Login failed.');
      }
    }

    try {
      const response: AxiosResponse<InboundsListResponse> =
        await this.axiosInstance.get('/panel/api/inbounds/list');

      if (response.data?.success && Array.isArray(response.data.obj)) {
        return response.data.obj;
      }

      // If response structure is different, try to return the data directly
      if (Array.isArray(response.data)) {
        return response.data;
      }

      throw new Error('Invalid response format from inbounds/list');
    } catch (error) {
      // If we get 401/403, try to re-authenticate once
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 401 || error.response?.status === 403)
      ) {
        this.isAuthenticated = false;
        const loggedIn = await this.login();
        if (loggedIn) {
          // Retry the request
          const response: AxiosResponse<InboundsListResponse> =
            await this.axiosInstance.get('/panel/api/inbounds/list');
          if (response.data?.success && Array.isArray(response.data.obj)) {
            return response.data.obj;
          }
          if (Array.isArray(response.data)) {
            return response.data;
          }
        }
      }

      throw error;
    }
  }

  /**
   * Check if client is authenticated
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    try {
      await this.axiosInstance.post('/panel/api/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all cookies
      this.cookieJar.removeAllCookies();
      this.isAuthenticated = false;
    }
  }
}
