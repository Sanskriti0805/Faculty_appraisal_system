import apiClient from './api';

export const publicationsService = {
  // Get publications by faculty
  getPublicationsByFaculty: async (facultyId) => {
    return await apiClient.get(`/publications/faculty/${facultyId}`);
  },

  // Create publication
  createPublication: async (publicationData) => {
    const formData = new FormData();

    Object.keys(publicationData).forEach(key => {
      if (key === 'authors' || key === 'editors') {
        formData.append(key, JSON.stringify(publicationData[key]));
      } else if (publicationData[key] !== null && publicationData[key] !== undefined) {
        formData.append(key, publicationData[key]);
      }
    });

    return await apiClient.post('/publications', formData);
  },

  // Delete publication
  deletePublication: async (id) => {
    return await apiClient.delete(`/publications/${id}`);
  },
};
