import apiClient from './api';

export const publicationsService = {
  // Get publications by faculty
  getPublicationsByFaculty: async (facultyId) => {
    return await apiClient.get(`/publications/faculty/${facultyId}`);
  },

  // Create publication
  createPublication: async (publicationData) => {
    return await apiClient.post('/publications', publicationData);
  },

  // Delete publication
  deletePublication: async (id) => {
    return await apiClient.delete(`/publications/${id}`);
  },
};
