import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { Privacy } from "./pages/Privacy";
import { Support } from "./pages/Support";

function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === "/") {
      document.title = "Donna";
    }
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <PageTitle />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="support" element={<Support />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
