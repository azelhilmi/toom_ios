import { lazy, Suspense, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AppSplash from "./components/AppSplash";
import OfflineBanner from "./components/OfflineBanner";
import LoadingScreen from "./components/UI/LoadingScreen";
import CameraPage from "./pages/CameraPage";
import LandingPage from "./pages/LandingPage";
import { hasVisitedBefore } from "./utils/landing";

// Chargées à la demande : ce sont des pages secondaires (réglages,
// galerie, événements) qui n'ont pas besoin d'alourdir le chargement
// initial de l'écran caméra, de loin le plus visité.
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ThemesPage = lazy(() => import("./pages/ThemesPage"));
const EventHubPage = lazy(() => import("./pages/EventHubPage"));
const EventCreatePage = lazy(() => import("./pages/EventCreatePage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const EventJoinPage = lazy(() => import("./pages/EventJoinPage"));
const JoinByCodePage = lazy(() => import("./pages/JoinByCodePage"));
const EventCameraPage = lazy(() => import("./pages/EventCameraPage"));
const EventDashboardPage = lazy(() => import("./pages/EventDashboardPage"));

function RootRoute() {
  const [showLanding, setShowLanding] = useState(() => !hasVisitedBefore());
  return showLanding ? <LandingPage onEnter={() => setShowLanding(false)} /> : <CameraPage />;
}

export default function App() {
  return (
    <>
      <OfflineBanner />
      <AuthProvider>
        <AppSplash />
        <ThemeProvider>
          <BrowserRouter>
            <div className="app-shell">
              <main className="app-main">
                <Suspense fallback={<LoadingScreen />}>
                  <Routes>
                    <Route path="/" element={<RootRoute />} />
                    <Route path="/gallery" element={<GalleryPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/themes" element={<ThemesPage />} />
                    <Route path="/event" element={<EventHubPage />} />
                    <Route path="/event/new" element={<EventCreatePage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/event/:eventId" element={<EventDashboardPage />} />
                    <Route path="/event/:eventId/camera" element={<EventCameraPage />} />
                    <Route path="/join" element={<JoinByCodePage />} />
                    <Route path="/invite/:inviteCode" element={<EventJoinPage />} />
                  </Routes>
                </Suspense>
              </main>
            </div>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </>
  );
}
