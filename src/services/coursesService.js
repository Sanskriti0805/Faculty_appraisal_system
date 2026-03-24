import apiClient from './api';

export const coursesService = {
  // Get courses taught by faculty
  getCoursesByFaculty: async (facultyId) => {
    return await apiClient.get(`/courses/faculty/${facultyId}`);
  },

  // Create course taught
  createCourse: async (courseData) => {
    return await apiClient.post('/courses', courseData);
  },

  // Delete course
  deleteCourse: async (id) => {
    return await apiClient.delete(`/courses/${id}`);
  },

  // Get new courses developed by faculty
  getNewCoursesByFaculty: async (facultyId) => {
    return await apiClient.get(`/courses/new/faculty/${facultyId}`);
  },

  // Create new course developed (with file upload)
  createNewCourse: async (courseData) => {
    const formData = new FormData();
    
    // Append all fields to FormData
    Object.keys(courseData).forEach(key => {
      if (courseData[key] !== null && courseData[key] !== undefined) {
        formData.append(key, courseData[key]);
      }
    });

    // Use apiClient for consistent base URL and interceptors
    return await apiClient.post('/courses/new', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
