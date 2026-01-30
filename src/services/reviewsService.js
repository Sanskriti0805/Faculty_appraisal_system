import apiClient from './api';

export const reviewsService = {
  // Get reviews by faculty
  getReviewsByFaculty: async (facultyId) => {
    return await apiClient.get(`/reviews/faculty/${facultyId}`);
  },

  // Create review
  createReview: async (reviewData) => {
    return await apiClient.post('/reviews', reviewData);
  },

  // Delete review
  deleteReview: async (id) => {
    return await apiClient.delete(`/reviews/${id}`);
  },
};
