import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, ProtectedRoute } from './components/auth/AuthProvider.jsx'
import { NotifyProvider } from './components/notifications/Notify.jsx'
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
import Deploy from './screens/Deploy.jsx'
import DeploymentDetails from './screens/DeploymentDetails.jsx'
import ActiveDeployment from './screens/ActiveDeployment.jsx'
import Wallet from './screens/Wallet.jsx'
import Transactions from './screens/Transactions.jsx'
import DataRevenue from './screens/DataRevenue.jsx'
import Rewards from './screens/Rewards.jsx'
import EventCode from './screens/EventCode.jsx'
import Boosts from './screens/Boosts.jsx'
import Marketplace from './screens/Marketplace.jsx'
import Academy from './screens/Academy.jsx'
import Community from './screens/Community.jsx'
import Referrals from './screens/Referrals.jsx'
import Notifications from './screens/Notifications.jsx'
import More from './screens/More.jsx'
import Profile from './screens/Profile.jsx'
import Settings from './screens/Settings.jsx'
import SecuritySettings from './screens/SecuritySettings.jsx'
import Support from './screens/Support.jsx'

const authenticated = (element) => <ProtectedRoute policy="authenticated">{element}</ProtectedRoute>
const verified = (element) => <ProtectedRoute requireVerified>{element}</ProtectedRoute>
const kyc = (element) => <ProtectedRoute policy="kyc">{element}</ProtectedRoute>

export default function App() {
  return (
    <AuthProvider>
      <NotifyProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<Splash />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

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

          <Route path="/deploy" element={verified(<Deploy />)} />
          <Route path="/deploy/active" element={verified(<ActiveDeployment />)} />
          <Route path="/deploy/active/:id" element={verified(<ActiveDeployment />)} />
          <Route path="/deploy/:name" element={verified(<DeploymentDetails />)} />

          <Route path="/wallet" element={kyc(<Wallet />)} />
          <Route path="/wallet/transactions" element={kyc(<Transactions />)} />
          <Route path="/wallet/data-revenue" element={kyc(<DataRevenue />)} />

          <Route path="/rewards" element={verified(<Rewards />)} />
          <Route path="/rewards/event-code" element={verified(<EventCode />)} />
          <Route path="/rewards/boosts" element={verified(<Boosts />)} />
          <Route path="/marketplace" element={verified(<Marketplace />)} />
          <Route path="/academy" element={verified(<Academy />)} />
          <Route path="/community" element={verified(<Community />)} />
          <Route path="/referrals" element={verified(<Referrals />)} />
          <Route path="/notifications" element={authenticated(<Notifications />)} />

          <Route path="/more" element={authenticated(<More />)} />
          <Route path="/profile" element={authenticated(<Profile />)} />
          <Route path="/settings" element={authenticated(<Settings />)} />
          <Route path="/settings/security" element={authenticated(<SecuritySettings />)} />
          <Route path="/support" element={authenticated(<Support />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </NotifyProvider>
    </AuthProvider>
  )
}
