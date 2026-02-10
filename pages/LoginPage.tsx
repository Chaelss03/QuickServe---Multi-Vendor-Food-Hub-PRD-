
import React, { useState } from 'react';
import { User } from '../types';
import { User as UserIcon, Lock, ChevronLeft, AlertCircle } from 'lucide-react';

interface Props {
  allUsers: User[];
  onLogin: (user: User) => void;
  onBack: () => void;
}

const LoginPage: React.FC<Props> = ({ allUsers, onLogin, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = allUsers.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      if (user.isActive === false) {
        setError('Your account has been deactivated. Please contact the administrator.');
        return;
      }
      onLogin(user);
    } else {
      setError('Invalid username or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col items-center justify-center px-4 py-12">
      <button 
        onClick={onBack}
        className="fixed top-8 left-8 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 font-semibold transition-colors"
      >
        <ChevronLeft size={20} />
        Back to Home
      </button>

      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-orange-100 dark:shadow-none mb-4">Q</div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Staff Portal</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Manage your restaurant operations</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl shadow-gray-200 dark:shadow-none border border-gray-100 dark:border-gray-700 p-8 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium border border-red-100 dark:border-red-900/40">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 ml-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <UserIcon size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 dark:text-white font-medium transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-100 dark:shadow-none hover:bg-orange-600 hover:scale-[1.02] active:scale-95 transition-all"
            >
              Sign In
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-center text-gray-400 dark:text-gray-500 font-medium uppercase tracking-widest">Demo Credentials</p>
            <div className="mt-4 grid grid-cols-2 gap-4 text-[10px] text-gray-500 dark:text-gray-400">
              <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                <p className="font-bold text-gray-700 dark:text-gray-200">Admin</p>
                <p>U: admin</p>
                <p>P: 123456</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                <p className="font-bold text-gray-700 dark:text-gray-200">Vendor</p>
                <p>U: burger_king</p>
                <p>P: password123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
