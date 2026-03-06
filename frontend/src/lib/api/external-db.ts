import { apiClient } from './client';

export interface DatabaseConnectionConfig {
    type: 'postgresql' | 'mysql' | 'mssql' | 'sqlite';
    host?: string;
    port?: number;
    database: string;
    username?: string;
    password?: string;
    ssl_mode?: string;
    file_path?: string; // For SQLite
}

export const externalDbService = {
    // Test connection
    testConnection: async (config: DatabaseConnectionConfig) => {
        const response = await apiClient.post('/external-db/test', config);
        return response.data;
    },

    // List tables
    listTables: async (config: DatabaseConnectionConfig) => {
        const response = await apiClient.post<string[]>('/external-db/tables', config);
        return response.data;
    },

    // Ingest data
    ingest: async (datasetId: string, config: DatabaseConnectionConfig, query: string) => {
        const response = await apiClient.post(`/datasets/${datasetId}/external-db/ingest`, {
            connection: config,
            query
        });
        return response.data;
    }
};
