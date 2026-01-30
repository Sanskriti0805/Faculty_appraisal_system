import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const patentsService = {
  // Get patents by faculty
  getPatentsByFaculty: async (facultyId) => {
    const response = await axios.get(`${API_BASE_URL}/patents/faculty/${facultyId}`);
    return response.data;
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

    const response = await axios.post(`${API_BASE_URL}/patents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete patent
  deletePatent: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/patents/${id}`);
    return response.data;
  },
};
