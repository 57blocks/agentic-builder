import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-7xl font-bold text-text-primary">404</h1>
          <h2 className="mt-4 text-2xl font-bold text-text-primary">
            Page not found
          </h2>
          <p className="mt-2 text-text-secondary">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => navigate("/")}>Go Home</Button>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
        <div className="mt-12">
          <p className="text-sm text-text-muted">
            If you think this is an error, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
};
