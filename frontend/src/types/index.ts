// User types
export interface User {
    id: string;
    name?: string;
    email: string;
    role: 'USER' | 'ADMIN';
    is_active: boolean;
}

// Dataset types
export interface Dataset {
    id: string;
    name: string;
    description?: string;
    owner_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface DatasetVersion {
    id: string;
    dataset_id: string;
    version_number: number;
    row_count: number;
    column_count: number;
    file_size: number;
    created_at: string;
}

// Chat types
export interface ChatSession {
    id: string;
    user_id: string;
    dataset_id?: string;
    title: string;
    message_count: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ChatMessage {
    id: string;
    session_id: string;
    role: 'user' | 'assistant';
    content: string;
    output_data?: any;
    intent_type?: string;
    sequence: number;
    created_at: string;
}

// Auth types
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

// API Response types
export interface ApiError {
    detail: string;
}
