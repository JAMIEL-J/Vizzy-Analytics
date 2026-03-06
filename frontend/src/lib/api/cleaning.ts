import { apiClient } from './client';

export interface CleaningPlan {
    id: string;
    dataset_version_id: string;
    proposed_actions: any;
    approved: boolean;
    approved_by?: string;
    approved_at?: string;
    is_active: boolean;
}

export const cleaningService = {
    // Create cleaning plan
    createPlan: async (versionId: string, proposedActions: any) => {
        const response = await apiClient.post<CleaningPlan>(`/versions/${versionId}/cleaning`, {
            proposed_actions: proposedActions
        });
        return response.data;
    },

    // Get active plan for version
    getPlan: async (versionId: string) => {
        const response = await apiClient.get<CleaningPlan>(`/versions/${versionId}/cleaning`);
        return response.data;
    },

    // Approve plan (execute it)
    approvePlan: async (planId: string) => {
        const response = await apiClient.post<CleaningPlan>(`/versions/${planId}/approve`);
        return response.data;
    }
};
