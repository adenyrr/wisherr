import React from 'react';
import { useAuthStore } from '../../../shared/utils/store';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const currentUser = useAuthStore(s => s.currentUser);
  const setToken = useAuthStore(s => s.setToken);
  const navigate = useNavigate();

  if (!currentUser) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Not signed in</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" onClick={() => navigate('/login')}>Sign in</button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Profile</h1>
      <p className="text-gray-700 dark:text-gray-300">Name: {currentUser.username}</p>
      <p className="text-gray-700 dark:text-gray-300">Email: {currentUser.email || '—'}</p>
      <div className="mt-4">
        <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" onClick={() => { setToken(null); localStorage.removeItem('token'); navigate('/login'); }}>Logout</button>
      </div>
    </div>
  );
}
