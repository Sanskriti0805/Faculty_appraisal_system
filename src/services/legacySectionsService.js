import apiClient from './api';

export const legacySectionsService = {
  getMySection: async (sectionKey) => {
    return await apiClient.get(`/legacy-sections/${sectionKey}/my`);
  },

  saveSection: async (sectionKey, content) => {
    return await apiClient.post(`/legacy-sections/${sectionKey}/save`, { content });
  },
};
