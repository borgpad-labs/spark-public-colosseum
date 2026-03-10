import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { Outlet, useLocation } from "react-router-dom"
import "./i18n/i18n"

import Header from "./components/Header/Header"
import Footer from "./components/Footer/Footer"
import EnvBanner from "./components/EnvBanner"
import SparkLayout from "./components/SparkLanding/SparkLayout"
import OnboardingModal from "./components/OnboardingModal"
import { PwaUpdatePrompt } from "./components/PwaUpdatePrompt"
import * as Sentry from "@sentry/react"

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  // Learn more at
  // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
  tracesSampleRate: 1.0,
  environment: import.meta.env.VITE_ENVIRONMENT_TYPE,
})

function App() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isIdeasPage = location.pathname === '/ideas' || location.pathname.startsWith('/ideas/') || 
    location.pathname === '/teams' || location.pathname === '/explanation' || location.pathname === '/roadmap';
  const isPublicProfile = location.pathname.startsWith('/profile/');

  // Get page title based on route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/discover') return 'Discover';
    if (path === '/projects') return 'Explore';
    if (path === '/profile') return 'Profile';
    if (path === '/search') return 'Search';
    if (path === '/apply') return 'Apply';
    if (path === '/volume') return 'Volume';
    if (path === '/fees') return 'Fees';
    if (path === '/ideas') return 'Ideas';
    return undefined; // No title for other pages
  };

  if (isLandingPage || isIdeasPage || isPublicProfile) {
    // Landing page, Ideas page, and Public Profile have their own layout
    return (
      <>
        <PwaUpdatePrompt />
        <OnboardingModal />
        <ToastContainer />
        <Outlet />
      </>
    );
  }

  // All other pages use the Spark layout
  return (
    <SparkLayout pageTitle={getPageTitle()} showFooter={false}>
      <PwaUpdatePrompt />
      <OnboardingModal />
      <ToastContainer />
      <Outlet />
    </SparkLayout>
  );
}

export default App
