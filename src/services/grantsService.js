import apiClient from './api';

export const grantsService = {
  // Get grants by faculty
  getGrantsByFaculty: async (facultyId) => {
    return await apiClient.get(`/grants/faculty/${facultyId}`);
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

    return await apiClient.post('/grants', formData);
  },

  updateGrant: async (id, grantData) => {
    const formData = new FormData();

    Object.keys(grantData).forEach(key => {
      if (grantData[key] !== null && grantData[key] !== undefined) {
        formData.append(key, grantData[key]);
      }
    });

    return await apiClient.put(`/grants/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Delete grant
  deleteGrant: async (id) => {
    return await apiClient.delete(`/grants/${id}`);
  },

  // Get proposals by faculty
  getProposalsByFaculty: async (facultyId) => {
    return await apiClient.get(`/grants/proposals/faculty/${facultyId}`);
  },

  // Create proposal
  createProposal: async (proposalData) => {
    const formData = new FormData();

    // Append all fields to FormData
    Object.keys(proposalData).forEach(key => {
      if (proposalData[key] !== null && proposalData[key] !== undefined) {
        formData.append(key, proposalData[key]);
      }
    });

    return await apiClient.post('/grants/proposals', formData);
  },

  updateProposal: async (id, proposalData) => {
    const formData = new FormData();

    Object.keys(proposalData).forEach(key => {
      if (proposalData[key] !== null && proposalData[key] !== undefined) {
        formData.append(key, proposalData[key]);
      }
    });

    return await apiClient.put(`/grants/proposals/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Delete proposal
  deleteProposal: async (id) => {
    return await apiClient.delete(`/grants/proposals/${id}`);
  },
};
