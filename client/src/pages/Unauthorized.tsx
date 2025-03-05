import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Unauthorized() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        
        <p className="text-gray-700 mb-6">
          You don't have permission to access this page. Please contact an administrator
          if you believe you should have access.
        </p>
        
        {user && (
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              Logged in as: <span className="font-medium">{user.email}</span>
              <br />
              Role: <span className="font-medium">{user.role}</span>
            </p>
          </div>
        )}
        
        <div className="flex justify-between">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Go Back
          </button>
          
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}