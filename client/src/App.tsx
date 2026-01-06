import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Order from "./pages/Order";
import Mall from "./pages/Mall";
import Profile from "./pages/Profile";
import Orders from "./pages/Orders";
import AdminProducts from "./pages/AdminProducts";
import IIKOSyncDemo from "./pages/IIKOSyncDemo";
import BottomNav from "./components/BottomNav";
import { AdminRoute } from "./components/AdminRoute";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <div className="pb-16">
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/order"} component={Order} />
        <Route path={"/mall"} component={Mall} />
        <Route path={"/orders"} component={Orders} />
        <Route path={"/profile"} component={Profile} />
        <Route path={"/admin/products"}>
          <AdminRoute>
            <AdminProducts />
          </AdminRoute>
        </Route>
        <Route path={"/iiko-sync-demo"} component={IIKOSyncDemo} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
