// API Configuration
const API_BASE_URL = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_URL || 'http://localhost:3001';

// Signup API call
export const signupUser = async (userData: {
  fullName: string;
  email: string;
  username: string;
  password: string;
}) => {
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
};

// Cancel reservation
export const cancelReservation = async (reservationId: number, userId: number) => {
  const response = await fetch(`${API_BASE_URL}/api/reservations/${reservationId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': String(userId),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error al cancelar la reservación');
  }

  return data;
};