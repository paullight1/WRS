import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, ProtectedRoute } from './components/auth/AuthProvider.jsx'
import { NotifyProvider } from './components/notifications/Notify.jsx'
import { RobotProvider } from './components/robot/RobotProvider.jsx'
import Landing from './screens/Landing.jsx'
import Splash from './screens/Splash.jsx'
import Login from './screens/Login.jsx'
import Register from './screens/Register.jsx'
import Verify from './screens/Verify.jsx'
import ForgotPassword from './screens/ForgotPassword.jsx'
import ResetPassword from './screens/ResetPassword.jsx'
import Onboarding from './screens/Onboarding.jsx'
import Home from './screens/Home.jsx'
import MyRobot from './screens/MyRobot.jsx'
import RobotPassport from './screens/RobotPassport.jsx'
import Customize from './screens/Customize.jsx'
import Packages from './screens/Packages.jsx'
import PackageDetail from './screens/PackageDetail.jsx'
import Checkout from './screens/Checkout.jsx'
import PaymentSuccess from './screens/PaymentSuccess.jsx'
import Training from './screens/Training.jsx'
import TrainingModule from './screens/TrainingModule.jsx'
import DataContribution from './screens/DataContribution.jsx'
import DataTask from './screens/DataTask.jsx'
import DataQuality from './screens/DataQuality.jsx'
import DeploymentDetailsProduction from './screens/DeploymentDetailsProduction.jsx'
import ActiveDeploymentProduction from './screens/ActiveDeploymentProduction.jsx'
import MiningProduction from './screens/MiningProduction.jsx'
import Wallet from './screens/Wallet.jsx'
import Transactions from './screens/Transactions.jsx'
import DataRevenue from './screens/DataRevenue.jsx'
import RewardsProduction from './screens/RewardsProduction.jsx'
import EventCodeProduction from './screens/EventCodeProduction.jsx'
import BoostsProduction from './screens/BoostsProduction.jsx'
import MarketplaceProduction from './screens/MarketplaceProduction.jsx'
import AcademyProduction from './screens/AcademyProduction.jsx'
import CommunityProduction from './screens/CommunityProduction.jsx'
import ReferralsProduction from './screens/ReferralsProduction.jsx'
import Notifications from './screens/Notifications.jsx'
import More from './screens/More.jsx'
import ProfileProduction from './screens/ProfileProduction.jsx'
import SettingsProduction from './screens/SettingsProduction.jsx'
import SecuritySettings from './screens/SecuritySettings.jsx'
import SupportProduction from './screens/SupportProduction.jsx'
import AccountDeletionRecoveryProduction from './screens/AccountDeletionRecoveryProduction.jsx'
import AdminOperationsProduction from './screens/AdminOperationsProduction.jsx'

const authenticated = (element) => <ProtectedRoute policy="authenticated">{element}</ProtectedRoute>
const verified = (element) => <ProtectedRoute requireVerified>{element}</ProtectedRoute>
const kyc = (element) => <ProtectedRoute policy="kyc">{element}</ProtectedRoute>
const operations = (element) => <ProtectedRoute policy="operations">{element}</ProtectedRoute>
const accountRecovery = (element) => <ProtectedRoute policy="account-recovery">{element}</ProtectedRoute>

const DeploymentDetailsScreen = DeploymentDetailsProduction
const ActiveDeploymentScreen = ActiveDeploymentProduction
const RewardsScreen = RewardsProduction
const EventCodeScreen = EventCodeProduction
const BoostsScreen = BoostsProduction
const MarketplaceScreen = MarketplaceProduction
const AcademyScreen = AcademyProduction
const CommunityScreen = CommunityProduction
const ReferralsScreen = ReferralsProduction
const ProfileScreen = ProfileProduction
const SettingsScreen = SettingsProduction
const SupportScreen = SupportProduction

export default function App() {
  return (
    <AuthProvider>
      <RobotProvider>
        <NotifyProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<Splash />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/account/deletion" element={accountRecovery(<AccountDeletionRecoveryProduction />)} />

            <Route path="/onboarding" element={verified(<Onboarding />)} />
            <Route path="/home" element={verified(<Home />)} />
            <Route path="/robot" element={verified(<MyRobot />)} />
            <Route path="/robot/passport" element={verified(<RobotPassport />)} />
            <Route path="/robot/customize" element={verified(<Customize />)} />

            <Route path="/packages" element={authenticated(<Packages />)} />
            <Route path="/packages/:slug" element={authenticated(<PackageDetail />)} />
            <Route path="/packages/:slug/checkout" element={verified(<Checkout />)} />
            <Route path="/packages/:slug/success" element={verified(<PaymentSuccess />)} />

            <Route path="/training" element={verified(<Training />)} />
            <Route path="/training/:slug" element={verified(<TrainingModule />)} />
            <Route path="/data" element={verified(<DataContribution />)} />
            <Route path="/data/quality" element={verified(<DataQuality />)} />
            <Route path="/data/:slug" element={verified(<DataTask />)} />

            <Route path="/deploy" element={verified(<MiningProduction />)} />
            <Route path="/deploy/active" element={verified(<ActiveDeploymentScreen />)} />
            <Route path="/deploy/active/:id" element={verified(<ActiveDeploymentScreen />)} />
            <Route path="/deploy/:name" element={verified(<DeploymentDetailsScreen />)} />

            <Route path="/wallet" element={kyc(<Wallet />)} />
            <Route path="/wallet/transactions" element={kyc(<Transactions />)} />
            <Route path="/wallet/data-revenue" element={kyc(<DataRevenue />)} />

            <Route path="/rewards" element={verified(<RewardsScreen />)} />
            <Route path="/rewards/event-code" element={verified(<EventCodeScreen />)} />
            <Route path="/rewards/boosts" element={verified(<BoostsScreen />)} />
            <Route path="/marketplace" element={verified(<MarketplaceScreen />)} />
            <Route path="/academy" element={verified(<AcademyScreen />)} />
            <Route path="/community" element={verified(<CommunityScreen />)} />
            <Route path="/referrals" element={verified(<ReferralsScreen />)} />
            <Route path="/notifications" element={authenticated(<Notifications />)} />

            <Route path="/more" element={authenticated(<More />)} />
            <Route path="/profile" element={authenticated(<ProfileScreen />)} />
            <Route path="/settings" element={authenticated(<SettingsScreen />)} />
            <Route path="/settings/security" element={authenticated(<SecuritySettings />)} />
            <Route path="/support" element={authenticated(<SupportScreen />)} />
            <Route path="/admin/operations" element={operations(<AdminOperationsProduction />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotifyProvider>
      </RobotProvider>
    </AuthProvider>
  )
}
