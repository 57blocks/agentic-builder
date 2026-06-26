import { Routes, Route } from "react-router-dom";
import { Home } from "./views/Home";
import { NotFound } from "./views/NotFound";

export function AppRouter() {
  return (
    <Routes>
      {/* Root route MUST resolve to a real page — never let `/` fall through
          to the `*` catch-all (NotFound). Replace <Home /> with the project's
          real landing page, or redirect `/` to it. */}
      <Route path="/" element={<Home />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
