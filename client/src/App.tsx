import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { useState, useEffect, useCallback } from "react";

// Custom hook: strips query string from hash so Wouter routes match correctly
// e.g. /#/marketplace/success?session_id=... → path is /marketplace/success
function useHashLocationNoQuery(): [string, (to: string) => void] {
  const getPath = () => {
    const hash = window.location.hash.replace(/^#/, "") || "/";
    return hash.split("?")[0] || "/";
  };
  const [path, setPath] = useState(getPath);
  useEffect(() => {
    const handler = () => setPath(getPath());
    window.addEventListener("hashchange", handler);
    // Also fire on initial load so Stripe redirect URLs are handled immediately
    handler();
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);
  return [path, navigate];
}
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Store from "./pages/Store";
import Directory from "./pages/Directory";
import Resources from "./pages/Resources";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import ListBusiness from "./pages/ListBusiness";
import Marketplace from "./pages/Marketplace";
import MarketplaceListing from "./pages/MarketplaceListing";
import MarketplaceSuccess from "./pages/MarketplaceSuccess";
import SellerOnboard from "./pages/SellerOnboard";
import NewListing from "./pages/NewListing";
import SellerDashboard from "./pages/SellerDashboard";
import NotFound from "./pages/not-found";
import AdminRecovery from "./pages/AdminRecovery";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router hook={useHashLocationNoQuery}>
          <Layout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/blog" component={Blog} />
              <Route path="/blog/:slug" component={BlogPost} />
              <Route path="/store" component={Store} />
              <Route path="/directory" component={Directory} />
              <Route path="/resources" component={Resources} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/profile" component={Profile} />
              <Route path="/list-business" component={ListBusiness} />
              <Route path="/marketplace/success" component={MarketplaceSuccess} />
              <Route path="/marketplace/:id" component={MarketplaceListing} />
              <Route path="/marketplace" component={Marketplace} />
              <Route path="/seller/onboard" component={SellerOnboard} />
              <Route path="/seller/new-listing" component={NewListing} />
              <Route path="/seller/dashboard" component={SellerDashboard} />
              <Route path="/login" component={Login} />
              <Route path="/register" component={Register} />
              <Route path="/admin-recovery" component={AdminRecovery} />
              <Route path="/admin" component={Admin} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
