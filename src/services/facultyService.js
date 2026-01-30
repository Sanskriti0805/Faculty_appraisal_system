import apiClient from './api';

export const facultyService = {
  // Get all faculty members
  getAllFaculty: async () => {
    return await apiClient.get('/faculty');
  },

  // Get faculty by ID
  getFacultyById: async (id) => {
    return await apiClient.get(`/faculty/${id}`);
  },

  // Create new faculty
  createFaculty: async (facultyData) => {
    return await apiClient.post('/faculty', facultyData);
  },

  // Update faculty
  updateFaculty: async (id, facultyData) => {
    return await apiClient.put(`/faculty/${id}`, facultyData);
  },

  // Delete faculty
  deleteFaculty: async (id) => {
    return await apiClient.delete(`/faculty/${id}`);
  },
};
