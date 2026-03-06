import { apiClient } from './client';
import type { LoginRequest, RegisterRequest, TokenResponse } from '../../types';

export const authApi = {
    /**
     * Generic login - accepts any role.
     * Consider using loginUser or loginAdmin for role-specific login.
     */
    login: async (credentials: LoginRequest): Promise<TokenResponse> => {
        const { data } = await apiClient.post<TokenResponse>('/auth/login', credentials);
        return data;
    },

    /**
     * User login - only allows users with role USER.
     */
    loginUser: async (credentials: LoginRequest): Promise<TokenResponse> => {
        const { data } = await apiClient.post<TokenResponse>('/auth/login/user', credentials);
        return data;
    },

    /**
     * Admin login - only allows users with role ADMIN.
     */
    loginAdmin: async (credentials: LoginRequest): Promise<TokenResponse> => {
        const { data } = await apiClient.post<TokenResponse>('/auth/login/admin', credentials);
        return data;
    },

    register: async (credentials: RegisterRequest): Promise<{ message: string }> => {
        const { data } = await apiClient.post('/auth/register', credentials);
        return data;
    },

    refreshToken: async (refreshToken: string): Promise<{ access_token: string }> => {
        const { data } = await apiClient.post('/auth/refresh', { refresh_token: refreshToken });
        return data;
    },
};
