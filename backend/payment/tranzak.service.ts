import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface TranzakTokenResponse {
  data: { token: string; expiresAt: number };
  success: boolean;
}

interface TranzakPaymentRequestResponse {
  data: {
    requestId: string;
    status: string;
    links: { paymentAuthUrl: string; returnUrl: string };
  };
  success: boolean;
  errorMsg?: string;
  errorCode?: number;
}

interface TranzakWebhookResource {
  requestId: string;
  status: string;
  transactionId?: string;
  mchTransactionRef: string;
  amount: number;
  currencyCode: string;
}

@Injectable()
export class TranzakService {
  private readonly logger = new Logger(TranzakService.name);
  private readonly http: AxiosInstance;
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private config: ConfigService) {
    const env = config.get('TRANZAK_ENV', 'sandbox');
    const baseURL =
      env === 'production'
        ? 'https://dsapi.tranzak.me'
        : 'https://sandbox.dsapi.tranzak.me';

    this.http = axios.create({ baseURL });
  }

  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    const appId = this.config.getOrThrow('TRANZAK_APP_ID');
    const appKey = this.config.getOrThrow('TRANZAK_APP_KEY');

    const res = await this.http.post<TranzakTokenResponse>('/auth/token', {
      appId,
      appKey,
    });

    if (!res.data.success) {
      throw new Error('Failed to obtain Tranzak token');
    }

    this.cachedToken = res.data.data.token;
    // Cache at 75% of TTL
    const ttlMs = (res.data.data.expiresAt - now) * 0.75;
    this.tokenExpiresAt = now + ttlMs;

    return this.cachedToken;
  }

  async createPaymentRequest(params: {
    amount: number;
    mchTransactionRef: string;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    callbackUrl: string;
  }): Promise<{ requestId: string; paymentAuthUrl: string }> {
    const token = await this.getToken();
    const appId = this.config.getOrThrow('TRANZAK_APP_ID');

    const res = await this.http.post<TranzakPaymentRequestResponse>(
      '/xp021/v1/request/create',
      {
        amount: params.amount,
        currencyCode: 'XAF',
        description: params.description,
        mchTransactionRef: params.mchTransactionRef,
        returnUrl: params.returnUrl,
        cancelUrl: params.cancelUrl,
        callbackUrl: params.callbackUrl,
        customization: {
          title: 'SHIBMATS Admission Fee',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-App-ID': appId,
        },
      },
    );

    if (!res.data.success) {
      this.logger.error('Tranzak payment request failed', res.data);
      throw new Error(`Tranzak error: ${res.data.errorMsg ?? 'Unknown error'}`);
    }

    return {
      requestId: res.data.data.requestId,
      paymentAuthUrl: res.data.data.links.paymentAuthUrl,
    };
  }
}
