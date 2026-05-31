import { Routes, Route } from "react-router-dom";
import { RootLayout } from "./components/layout/root-layout";
import { HomePage } from "./pages/HomePage";
import { DocsPage } from "./pages/DocsPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { BuilderPage } from "./pages/BuilderPage";
import { RequireAuth } from "./components/auth/require-auth";

export function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/docs" element={<DocsPage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
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
