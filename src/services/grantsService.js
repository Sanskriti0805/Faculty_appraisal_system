import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const grantsService = {
  // Get grants by faculty
  getGrantsByFaculty: async (facultyId) => {
    const response = await axios.get(`${API_BASE_URL}/grants/faculty/${facultyId}`);
    return response.data;
  },

  // Create grant (with file upload)
  createGrant: async (grantData) => {
    const formData = new FormData();
    
    // Append all fields to FormData
    Object.keys(grantData).forEach(key => {
      if (grantData[key] !== null && grantData[key] !== undefined) {
        formData.append(key, grantData[key]);
      }
    });

    const response = await axios.post(`${API_BASE_URL}/grants`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete grant
  deleteGrant: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/grants/${id}`);
    return response.data;
  },

  // Get proposals by faculty
  getProposalsByFaculty: async (facultyId) => {
    const response = await axios.get(`${API_BASE_URL}/grants/proposals/faculty/${facultyId}`);
    return response.data;
  },

  // Create proposal
  createProposal: async (proposalData) => {
    const response = await axios.post(`${API_BASE_URL}/grants/proposals`, proposalData);
    return response.data;
  },

  // Delete proposal
  deleteProposal: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/grants/proposals/${id}`);
    return response.data;
  },
};
