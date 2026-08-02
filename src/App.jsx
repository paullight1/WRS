import { Routes, Route, Navigate } from 'react-router-dom'

import Landing from './screens/Landing.jsx'
import Splash from './screens/Splash.jsx'
import Login from './screens/Login.jsx'
import Register from './screens/Register.jsx'
import Verify from './screens/Verify.jsx'
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
import Support from './screens/Support.jsx'

export default function App() {
  return (
    <Routes>
      {/* public site */}
      <Route path="/" element={<Landing />} />

      {/* auth + onboarding — Splash is the app's own entry, not the public one */}
      <Route path="/app" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<Verify />} />
      <Route path="/onboarding" element={<Onboarding />} />

      {/* core */}
      <Route path="/home" element={<Home />} />
      <Route path="/robot" element={<MyRobot />} />
      <Route path="/robot/passport" element={<RobotPassport />} />
      <Route path="/robot/customize" element={<Customize />} />

      {/* packages */}
      <Route path="/packages" element={<Packages />} />
      <Route path="/packages/:slug" element={<PackageDetail />} />
      <Route path="/packages/:slug/checkout" element={<Checkout />} />
      <Route path="/packages/:slug/success" element={<PaymentSuccess />} />

      {/* training */}
      <Route path="/training" element={<Training />} />
      <Route path="/training/:slug" element={<TrainingModule />} />

      {/* data */}
      <Route path="/data" element={<DataContribution />} />
      <Route path="/data/quality" element={<DataQuality />} />
      <Route path="/data/:slug" element={<DataTask />} />

      {/* deployment */}
      <Route path="/deploy" element={<Deploy />} />
      <Route path="/deploy/active" element={<ActiveDeployment />} />
      <Route path="/deploy/active/:id" element={<ActiveDeployment />} />
      <Route path="/deploy/:name" element={<DeploymentDetails />} />

      {/* wallet */}
      <Route path="/wallet" element={<Wallet />} />
      <Route path="/wallet/transactions" element={<Transactions />} />
      <Route path="/wallet/data-revenue" element={<DataRevenue />} />

      {/* rewards */}
      <Route path="/rewards" element={<Rewards />} />
      <Route path="/rewards/event-code" element={<EventCode />} />
      <Route path="/rewards/boosts" element={<Boosts />} />

      {/* ecosystem */}
      <Route path="/marketplace" element={<Marketplace />} />
      <Route path="/academy" element={<Academy />} />
      <Route path="/community" element={<Community />} />
      <Route path="/referrals" element={<Referrals />} />
      <Route path="/notifications" element={<Notifications />} />

      {/* account */}
      <Route path="/more" element={<More />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/support" element={<Support />} />

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}
