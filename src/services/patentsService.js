import apiClient from './api';

export const patentsService = {
  // Get patents by faculty
  getPatentsByFaculty: async (facultyId) => {
    return await apiClient.get(`/patents/faculty/${facultyId}`);
  },

  // Create patent (with file upload)
  createPatent: async (patentData) => {
    const formData = new FormData();
    
    // Append all fields to FormData
    Object.keys(patentData).forEach(key => {
      if (key === 'authors') {
        // Stringify authors array
        formData.append(key, JSON.stringify(patentData[key]));
      } else if (patentData[key] !== null && patentData[key] !== undefined) {
        formData.append(key, patentData[key]);
      }
    });

    return await apiClient.post('/patents', formData);
  },

  // Delete patent
  deletePatent: async (id) => {
    return await apiClient.delete(`/patents/${id}`);
  },
};
