import { Routes, Route } from "react-router-dom";
import { RootLayout } from "./components/layout/root-layout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { BuilderPage } from "./pages/BuilderPage";
import { RequireAuth } from "./components/auth/require-auth";

export function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<HomePage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/builder"
        element={
          <RequireAuth>
            <BuilderPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
