// src/components/ProtectedRoute.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { loadSession } from "../Session";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedTypes?: string[]; // Optional: restrict to specific user types
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedTypes,
}) => {
  const session = loadSession();
  const location = useLocation();

  // No session at all — redirect to home with the intended path saved
  if (!session) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Session exists but wrong user type (e.g. student hitting admin route)
  if (allowedTypes && !allowedTypes.includes(session.userType)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
