// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Signup API call
export const signupUser = async (userData: {
  fullName: string;
  email: string;
  username: string;
  password: string;
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al registrar el usuario');
    }

    return data;
  } catch (error) {
    throw error;
  }
};
