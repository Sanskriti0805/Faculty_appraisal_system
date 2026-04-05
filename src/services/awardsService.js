import apiClient from './api';

export const awardsService = {
    createAward: async (formData) => {
        return await apiClient.post('/awards', formData);
    },

    getAwards: async (facultyId) => {
        return await apiClient.get(`/awards/${facultyId}`);
    },

    deleteAward: async (id) => {
        return await apiClient.delete(`/awards/${id}`);
    }
};
