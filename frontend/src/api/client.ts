import axios, { AxiosError } from 'axios';
import type { ApiFailure } from '@/types/api';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
});

export class ApiClientError extends Error {
  readonly status?: number;
  readonly details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiFailure>) => {
    const message = error.response?.data?.error?.message ?? error.message ?? 'Something went wrong';
    return Promise.reject(new ApiClientError(message, error.response?.status, error.response?.data?.error?.details));
  }
);
