import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppProvider } from "./contexts/AppContext";
import Home from "./pages/Home";
import Order from "./pages/Order";
import Mall from "./pages/Mall";
import MallProductDetail from "./pages/MallProductDetail";
import Profile from "./pages/Profile";
import InfluencerHub from "./pages/InfluencerHub";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import Coupons from "./pages/Coupons";
import Membership from "./pages/Membership";
import Payment from "./pages/Payment";
import Settings from "./pages/Settings";
import StoreList from "./pages/StoreList";
import Addresses from "./pages/Addresses";
import ActivityCenter from "./pages/ActivityCenter";
import OrderDetail from "./pages/OrderDetail";
import Favorites from "./pages/Favorites";
import GiftCards from "./pages/GiftCards";
import ProductDetail from "./pages/ProductDetail";
import Referral from "./pages/Referral";
import MallCheckout from "./pages/MallCheckout";
import InfluencerLeaderboard from "./pages/InfluencerLeaderboard";
import InfluencerCases from "./pages/InfluencerCases";
import GroupBuy from "./pages/GroupBuy";
import GiftCardClaim from "./pages/GiftCardClaim";
import FlashSale from "./pages/FlashSale";
import Commission from "./pages/Commission";
import CommissionWithdraw from "./pages/CommissionWithdraw";
import MembershipUpgradeListener from "./components/MembershipUpgradeListener";
import POSSimulator from "./pages/admin/POSSimulator";
import DataOverview from "./pages/admin/DataOverview";
import SystemSettings from "./pages/admin/SystemSettings";
import Dashboard from "./pages/admin/Dashboard";
import Withdrawals from "./pages/admin/Withdrawals";
import SDUIConfig from "./pages/admin/SDUIConfig";
import SKUManagement from "./pages/admin/SKUManagement";
import BrainDashboard from "./pages/admin/BrainDashboard";
import TenantManagement from "./pages/admin/TenantManagement";
import ProductManagement from "./pages/admin/ProductManagement";
import BannerManagement from "./pages/admin/BannerManagement";
import MarketingRules from "./pages/admin/MarketingRules";
import InfluencerManagement from "./pages/admin/InfluencerManagement";
import OrganizationSettings from "./pages/admin/OrganizationSettings";
import BIAnalysisHub from "./pages/admin/BIAnalysisHub";
import IntegrationHub from "./pages/admin/IntegrationHub";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import ProductList from "./pages/admin/ProductList";
import ProductEditor from "./pages/admin/ProductEditor";
import PricingRulesList from "./pages/admin/PricingRulesList";
import PricingRuleForm from "./pages/admin/PricingRuleForm";
import LayoutsList from "./pages/admin/LayoutsList";
import LayoutEditor from "./pages/admin/LayoutEditor";
import AdminOrderList from "./pages/admin/AdminOrderList";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import CallScreen from "./pages/CallScreen";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import { AuthProvider } from "./contexts/AuthContext";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/login"} component={LoginPage} />
      <Route path={"/profile-auth"} component={ProfilePage} />
      <Route path={"/"} component={Home} />
      <Route path={"/order"} component={Order} />
      <Route path={"/product/:id"} component={ProductDetail} />
      <Route path={"/checkout"} component={Checkout} />
      <Route path={"/mall-checkout"} component={MallCheckout} />
      <Route path={"/mall/:id"} component={MallProductDetail} />
      <Route path={"/mall"} component={Mall} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/influencer"} component={InfluencerHub} />
      <Route
        path={"/influencer/leaderboard"}
        component={InfluencerLeaderboard}
      />
      <Route path={"/influencer/cases"} component={InfluencerCases} />
      <Route path={"/orders/:id"} component={OrderDetail} />
      <Route path={"/orders"} component={Orders} />
      <Route path={"/coupons"} component={Coupons} />
      <Route path={"/membership"} component={Membership} />
      <Route path={"/payment"} component={Payment} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/stores"} component={StoreList} />
      <Route path={"/addresses"} component={Addresses} />
      <Route path={"/activity-center"} component={ActivityCenter} />
      <Route path={"/favorites"} component={Favorites} />
      <Route path={"/gift-cards"} component={GiftCards} />
      <Route path={"/referral"} component={Referral} />
      <Route path={"/group-buy"} component={GroupBuy} />
      <Route path={"/gift-card/claim/:code"} component={GiftCardClaim} />
      <Route path={"/flash-sale"} component={FlashSale} />
      <Route path={"/commission"} component={Commission} />
      <Route path={"/commission/withdraw"} component={CommissionWithdraw} />
      <Route path={"/admin/pos-simulator"} component={POSSimulator} />
      <Route path="/call-screen" component={CallScreen} />
      <Route path="/admin/data-overview" component={DataOverview} />
      <Route path="/admin/settings" component={SystemSettings} />
      <Route path="/admin/dashboard" component={Dashboard} />
      <Route path="/admin/withdrawals" component={Withdrawals} />
      <Route path="/admin/sdui" component={SDUIConfig} />
      <Route path="/admin/skus" component={SKUManagement} />
      <Route path="/admin/brain" component={BrainDashboard} />
      <Route path="/admin/tenants" component={TenantManagement} />
      <Route
        path="/admin/ops/product-management"
        component={ProductManagement}
      />
      <Route path="/admin/marketing/banners" component={BannerManagement} />
      <Route path="/admin/marketing/rules" component={MarketingRules} />
      <Route
        path="/admin/marketing/influencers"
        component={InfluencerManagement}
      />
      <Route
        path="/admin/system/organizations"
        component={OrganizationSettings}
      />
      <Route path="/admin/bi" component={BIAnalysisHub} />
      {/* Integration Hub - Global Control Center */}
      <Route path="/admin/settings/hub" component={IntegrationHub} />
      {/* AI routes - redirect to BI Analysis Hub */}
      <Route path="/admin/ai/cockpit" component={BIAnalysisHub} />
      <Route path="/admin/ai/reports" component={BIAnalysisHub} />
      <Route path="/admin/ai/customer-service" component={BIAnalysisHub} />
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin/products/new" component={ProductEditor} />
      <Route path="/admin/products/edit/:id" component={ProductEditor} />
      <Route path="/admin/products" component={ProductList} />
      <Route path="/admin/pricing-rules/new" component={PricingRuleForm} />
      <Route path="/admin/pricing-rules/edit/:id" component={PricingRuleForm} />
      <Route path="/admin/pricing-rules" component={PricingRulesList} />
      <Route path="/admin/layouts/edit/:page" component={LayoutEditor} />
      <Route path="/admin/layouts" component={LayoutsList} />
      <Route path="/admin/orders/:id" component={AdminOrderDetail} />
      <Route path="/admin/orders" component={AdminOrderList} />
      <Route path="/admin" component={Dashboard} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <AppProvider>
            <TooltipProvider>
              <Toaster />
              <PWAInstallPrompt />
              <MembershipUpgradeListener />
              <Router />
            </TooltipProvider>
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
