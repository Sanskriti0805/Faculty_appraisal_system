import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const awardsService = {
    createAward: async (formData) => {
        const response = await axios.post(`${API_URL}/awards`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    getAwards: async (facultyId) => {
        const response = await axios.get(`${API_URL}/awards/${facultyId}`);
        return response.data;
    },

    deleteAward: async (id) => {
        const response = await axios.delete(`${API_URL}/awards/${id}`);
        return response.data;
    }
};
