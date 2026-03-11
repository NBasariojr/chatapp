// packages/shared/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import type { ApiResponse } from '../types';

interface ApiClientConfig {
  baseURL: string;
  getToken?: () => string | null;
  onUnauthorized?: () => void;
}

/**
 * Creates a configured axios instance for use across web, mobile, and desktop
 */
export const createApiClient = (config: ApiClientConfig): AxiosInstance => {
  const client = axios.create({
    baseURL: config.baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor: attach JWT token
  client.interceptors.request.use(
    (requestConfig) => {
      const token = config.getToken?.();
      if (token && requestConfig.headers) {
        requestConfig.headers.Authorization = `Bearer ${token}`;
      }
      return requestConfig;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor: handle common errors
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        config.onUnauthorized?.();
      }
      return Promise.reject(error);
    }
  );

  return client;
};

/**
 * Typed API call helper with error normalization
 */
export const apiCall = async <T>(
  client: AxiosInstance,
  axiosConfig: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  try {
    const response = await client.request<ApiResponse<T>>(axiosConfig);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message: string }>;
    throw new Error(
      axiosError.response?.data?.message ||
        axiosError.message ||
        'An unexpected error occurred'
    );
  }
};
