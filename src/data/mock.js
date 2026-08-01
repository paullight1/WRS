// Static mock data for the WRS interface prototype.
// Nothing here talks to a backend — every figure is illustrative only.

export const user = {
  name: 'David Johnson',
  firstName: 'David',
  wrsId: 'WRS785432',
  country: 'Nigeria',
  memberSince: 'March 2025',
  verified: true,
  package: 'Professional',
  referralCode: 'WRS-DAVID-8842',
}

export const robot = {
  name: 'WRS-Pro-001',
  id: 'WRS-785432',
  package: 'Professional Package',
  robotClass: 'Professional Robot',
  status: 'Online',
  level: 10,
  levelTitle: 'Professional',
  xp: 12450,
  nextLevelXp: 15000,
  performance: 92,
  health: 95,
  activationDate: '12 March 2025',
  aiVersion: 'WRS Core v4.2',
  personality: 'Logical',
  voiceProfile: 'David — Custom EN/YO',
  dataQuality: 94,
  reputation: 'Trusted',
  career: 'Senior Logistics Assistant',
  memoryUsed: 78,
}

export const capabilities = [
  { icon: 'language', label: 'Languages', value: '8 Active', tone: 'primary' },
  { icon: 'auto_awesome', label: 'Skills', value: '6 Installed', tone: 'secondary' },
  { icon: 'memory', label: 'Memory', value: '78% Used', tone: 'tertiary' },
  { icon: 'rocket_launch', label: 'Deployment', value: 'Active', tone: 'success' },
]

export const todayOverview = [
  { label: 'Tasks Completed', value: '24', icon: 'task_alt' },
  { label: 'Hours Worked', value: '6.4h', icon: 'schedule' },
  { label: 'Data Contributions', value: '12', icon: 'dataset' },
  { label: 'XP Gained', value: '+350', icon: 'bolt' },
]

export const latestUpdates = [
  { icon: 'translate', text: 'New AI language pack available.', time: '12m ago', tone: 'primary' },
  { icon: 'verified', text: 'Your data contribution has been approved.', time: '1h ago', tone: 'tertiary' },
  { icon: 'rocket_launch', text: 'New deployment opportunity available.', time: '3h ago', tone: 'secondary' },
  { icon: 'bolt', text: 'You earned 350 XP.', time: '5h ago', tone: 'primary' },
  { icon: 'groups', text: 'Community meeting starts soon.', time: 'Today 18:00', tone: 'tertiary' },
]

export const packages = [
  {
    slug: 'starter',
    name: 'Starter',
    price: 20,
    robotClass: 'Explorer Robot',
    tag: 'Get Started',
    icon: 'smart_toy',
    tone: 'primary',
    tagTone: 'primary',
    performance: 'Basic',
    bestFor: 'New users, students, and community members exploring WRS.',
    features: [
      'Basic AI assistant',
      'Two language slots',
      'One basic deployment category',
      'Community access',
      'Robot wallet',
      'Basic training tools',
      'Points and rewards access',
      'Referral access',
    ],
    deployment: [
      'Simple digital tasks',
      'Beginner data contribution',
      'Community support tasks',
      'Entry-level virtual assignments',
    ],
    data: ['Basic voice recording', 'Simple text creation', 'Basic image labeling', 'Meeting participation tasks'],
    benefits: { deployment: 'Low', rewards: 'Low', revenue: 'Low', performance: 'Basic' },
  },
  {
    slug: 'builder',
    name: 'Builder',
    price: 50,
    robotClass: 'Worker Robot',
    tag: 'More Power',
    icon: 'construction',
    tone: 'secondary',
    tagTone: 'secondary',
    performance: 'Moderate',
    bestFor: 'Members ready to automate simple day-to-day workflows.',
    features: [
      'Everything in Starter',
      'Five language slots',
      'Basic workflow automation',
      'Three deployment categories',
      'Expanded robot memory',
      'Skill upgrade access',
      'Basic robot analytics',
      'More daily data tasks',
    ],
    deployment: ['Retail support', 'Hospitality support', 'Entry-level warehousing', 'Customer engagement tasks'],
    data: ['Voice recording', 'Text labeling', 'Image annotation', 'Speech transcription', 'Translation tasks'],
    benefits: { deployment: 'Low - Medium', rewards: 'Low', revenue: 'Low', performance: 'Moderate' },
  },
  {
    slug: 'professional',
    name: 'Professional',
    price: 100,
    robotClass: 'Professional Robot',
    tag: 'Best Value',
    badge: 'Most Popular',
    icon: 'workspace_premium',
    tone: 'tertiary',
    tagTone: 'tertiary',
    performance: 'High',
    bestFor: 'Owners who want real deployment access and marketplace tools.',
    features: [
      'Everything in Builder Package',
      'Unlimited language learning',
      'Voice & personality customization',
      'Advanced AI memory vault',
      'Business workflow training',
      'Marketplace access',
      'Higher data revenue share',
      'Advanced performance analytics',
    ],
    deployment: [
      'Agriculture',
      'Manufacturing',
      'Logistics',
      'Warehousing',
      'Customer support',
      'Digital business services',
    ],
    data: [
      'Voice datasets',
      'Language datasets',
      'Facial expressions',
      'Movement and gesture',
      'Image and video annotation',
      'Human preference evaluation',
    ],
    benefits: { deployment: 'Medium - High', rewards: 'Medium', revenue: 'Medium', performance: 'High' },
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    price: 200,
    robotClass: 'Enterprise Robot',
    tag: 'Advanced',
    icon: 'corporate_fare',
    tone: 'primary',
    tagTone: 'gold',
    performance: 'Advanced',
    bestFor: 'Teams operating robots across regulated industries.',
    features: [
      'Everything in Professional',
      'Advanced AI reasoning',
      'Industry certification',
      'Enterprise workflow training',
      'Team collaboration',
      'Priority deployment access',
      'Advanced reporting',
      'Larger data upload limits',
    ],
    deployment: [
      'Healthcare support',
      'Construction',
      'Industrial operations',
      'Security monitoring',
      'Facility management',
      'Enterprise customer service',
    ],
    data: [
      'Industry-specific datasets',
      'Technical data annotation',
      'Complex workflow recording',
      'Specialized translation',
      'Professional voice datasets',
    ],
    benefits: { deployment: 'High', rewards: 'Medium - High', revenue: 'Medium - High', performance: 'Advanced' },
  },
  {
    slug: 'elite',
    name: 'Elite',
    price: 500,
    robotClass: 'Elite Robot',
    tag: 'High Performance',
    icon: 'diamond',
    tone: 'secondary',
    tagTone: 'gold',
    performance: 'Very High',
    bestFor: 'Operators scaling a fleet with premium automation.',
    features: [
      'Everything in Enterprise',
      'Premium AI engine',
      'High-capacity robot memory',
      'Priority industry deployment',
      'Advanced automation tools',
      'Early access to new features',
      'Premium customization',
      'Fleet expansion eligibility',
    ],
    deployment: [
      'Advanced logistics',
      'Industrial automation',
      'Smart facility operations',
      'High-value enterprise assignments',
      'Priority global virtual work',
    ],
    data: [
      'Premium AI training projects',
      'High-value multilingual datasets',
      'Advanced movement capture',
      'Professional video annotation',
      'Complex RLHF tasks',
    ],
    benefits: { deployment: 'High', rewards: 'High', revenue: 'High', performance: 'Very High' },
  },
  {
    slug: 'visionary',
    name: 'Visionary',
    price: 1000,
    robotClass: 'Visionary Robot',
    tag: 'Ultimate Tier',
    badge: 'Ultimate Package',
    icon: 'rocket_launch',
    tone: 'tertiary',
    tagTone: 'gold',
    performance: 'Premium',
    bestFor: 'Ambassadors shaping the platform and its research roadmap.',
    features: [
      'Everything in Elite',
      'Top-tier AI capability',
      'Premium global deployment eligibility',
      'Highest storage and training limits',
      'Dedicated account support',
      'Beta access to future features',
      'Governance participation',
      'Developer and API access',
    ],
    deployment: [
      'Global enterprise assignments',
      'Advanced robotics simulations',
      'AI research participation',
      'High-level automation programs',
      'Future physical robot deployment',
    ],
    data: [
      'Premium research datasets',
      'Global multilingual data projects',
      'Advanced voice and motion datasets',
      'AI safety evaluation',
      'Specialized robotics training data',
    ],
    benefits: { deployment: 'Premium', rewards: 'Premium', revenue: 'Premium', performance: 'Premium' },
  },
]

export const comparisonRows = [
  { label: 'Price', values: ['$20', '$50', '$100', '$200', '$500', '$1,000'] },
  { label: 'Robot class', values: ['Explorer', 'Worker', 'Professional', 'Enterprise', 'Elite', 'Visionary'] },
  { label: 'Languages', values: ['2', '5', 'Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'] },
  { label: 'AI memory', values: ['Basic', 'Expanded', 'Vault', 'Vault+', 'High capacity', 'Maximum'] },
  { label: 'Deployment categories', values: ['1', '3', '6', '12', 'Priority', 'Global'] },
  { label: 'Upload limits', values: ['Low', 'Medium', 'High', 'Higher', 'Premium', 'Maximum'] },
  { label: 'Marketplace access', values: ['—', '—', 'Yes', 'Yes', 'Premium', 'Advanced'] },
  { label: 'Revenue participation', values: ['Entry', 'Low', 'Medium', 'Med-High', 'High', 'Highest'] },
  { label: 'Support level', values: ['Community', 'Standard', 'Priority', 'Enterprise', 'Dedicated', 'Account mgr'] },
  { label: 'Analytics', values: ['—', 'Basic', 'Advanced', 'Reporting', 'Premium', 'Full suite'] },
  { label: 'Beta features', values: ['—', '—', '—', 'Partial', 'Yes', 'Yes'] },
  { label: 'Developer access', values: ['—', '—', '—', '—', 'Limited', 'Full API'] },
]

export const trainingModules = [
  {
    slug: 'voice',
    icon: 'mic',
    title: 'Voice Training',
    desc: 'Record your voice, pronunciation and commands',
    tone: 'primary',
    progress: 72,
  },
  {
    slug: 'language',
    icon: 'translate',
    title: 'Language Training',
    desc: 'Add local and global languages',
    tone: 'tertiary',
    progress: 55,
  },
  {
    slug: 'movement',
    icon: 'directions_walk',
    title: 'Movement & Gesture',
    desc: 'Teach walking and body movements',
    tone: 'secondary',
    progress: 30,
  },
  {
    slug: 'facial',
    icon: 'sentiment_satisfied',
    title: 'Facial Expressions',
    desc: 'Add facial and emotion data',
    tone: 'primary',
    progress: 18,
  },
  {
    slug: 'skill',
    icon: 'menu_book',
    title: 'Skill Training',
    desc: 'Upload workflows and knowledge',
    tone: 'tertiary',
    progress: 64,
  },
  {
    slug: 'custom',
    icon: 'folder_open',
    title: 'Custom Data',
    desc: 'Approved datasets and documents',
    tone: 'secondary',
    progress: 8,
  },
]

export const dataTasks = [
  { slug: 'voice-recording', icon: 'mic', title: 'Voice Recording', cat: 'Audio Data', xp: 200, time: '8 min', tone: 'primary' },
  { slug: 'image-annotation', icon: 'image', title: 'Image Annotation', cat: 'Vision Data', xp: 150, time: '12 min', tone: 'tertiary' },
  { slug: 'video-annotation', icon: 'videocam', title: 'Video Annotation', cat: 'Motion Data', xp: 250, time: '20 min', tone: 'secondary' },
  { slug: 'text-translation', icon: 'translate', title: 'Text & Translation', cat: 'NLP Data', xp: 180, time: '10 min', tone: 'primary' },
  { slug: 'speech-transcription', icon: 'record_voice_over', title: 'Speech Transcription', cat: 'Audio Data', xp: 220, time: '15 min', tone: 'tertiary' },
  { slug: 'conversation-review', icon: 'forum', title: 'Conversation Review', cat: 'Preference Data', xp: 260, time: '18 min', tone: 'secondary' },
]

export const dataStats = [
  { label: 'Data Submitted', value: '248', tone: 'on-surface' },
  { label: 'Quality Score', value: '94%', tone: 'tertiary' },
  { label: 'Rewards', value: '1,250 XP', tone: 'secondary' },
]

export const industries = [
  { name: 'Agriculture', desc: 'Farming & food production', icon: 'potted_plant', tone: 'primary', demand: 'High', rate: '$14.20/hr' },
  { name: 'Manufacturing', desc: 'Factory & production', icon: 'factory', tone: 'secondary', demand: 'High', rate: '$16.80/hr' },
  { name: 'Logistics & Warehousing', desc: 'Supply chain & delivery', icon: 'local_shipping', tone: 'tertiary', demand: 'Very High', rate: '$15.50/hr' },
  { name: 'Healthcare', desc: 'Hospital support', icon: 'medical_services', tone: 'error', demand: 'Medium', rate: '$18.40/hr' },
  { name: 'Hospitality', desc: 'Hotels & tourism', icon: 'apartment', tone: 'primary', demand: 'Medium', rate: '$12.90/hr' },
  { name: 'Retail', desc: 'Stores & customer service', icon: 'storefront', tone: 'secondary', demand: 'Medium', rate: '$11.75/hr' },
  { name: 'Construction', desc: 'Sites & operations', icon: 'engineering', tone: 'tertiary', demand: 'Low', rate: '$17.10/hr' },
  { name: 'Security', desc: 'Monitoring & patrol', icon: 'shield', tone: 'primary', demand: 'Medium', rate: '$13.60/hr' },
  { name: 'Education', desc: 'Learning support', icon: 'school', tone: 'secondary', demand: 'Low', rate: '$10.40/hr' },
]

export const earningSources = [
  { icon: 'rocket_launch', label: 'Robot Deployment', share: '41% Contribution', amount: '$120.00', delta: '+12.5%', tone: 'primary', state: 'Confirmed' },
  { icon: 'model_training', label: 'Data Contribution', share: '19% Contribution', amount: '$35.40', delta: '+5.2%', tone: 'tertiary', state: 'Confirmed' },
  { icon: 'group_add', label: 'Referral Rewards', share: '11% Contribution', amount: '$20.00', delta: 'New Bonus', tone: 'secondary', state: 'Promotional' },
  { icon: 'storefront', label: 'Marketplace Sales', share: '6% Contribution', amount: '$11.00', delta: 'Pending', tone: 'primary', state: 'Pending' },
]

export const transactions = [
  { icon: 'south_west', label: 'Deployment payout', date: '28 Jul 2025', amount: '+$42.00', positive: true, state: 'Confirmed' },
  { icon: 'north_east', label: 'Withdrawal to bank', date: '24 Jul 2025', amount: '-$80.00', positive: false, state: 'Completed' },
  { icon: 'south_west', label: 'Dataset licensing share', date: '21 Jul 2025', amount: '+$18.60', positive: true, state: 'Confirmed' },
  { icon: 'south_west', label: 'Referral bonus', date: '19 Jul 2025', amount: '+$20.00', positive: true, state: 'Promotional' },
  { icon: 'south_west', label: 'Marketplace sale', date: '15 Jul 2025', amount: '+$11.00', positive: true, state: 'Pending' },
]

export const rewardWays = [
  { icon: 'groups', label: 'Attend WRS Meetings', desc: 'Join weekly community syncs', xp: 100, tone: 'primary' },
  { icon: 'qr_code_scanner', label: 'Input Event Code', desc: 'Codes from live events', xp: 100, tone: 'secondary' },
  { icon: 'school', label: 'Complete Courses', desc: 'Robot Academy training', xp: 300, tone: 'tertiary' },
  { icon: 'person_add', label: 'Refer New Members', desc: 'Grow the robotic network', xp: 250, tone: 'error' },
  { icon: 'upload_file', label: 'Submit Quality Data', desc: 'High-precision contributions', xp: 200, tone: 'primary' },
  { icon: 'model_training', label: 'Complete AI Training', desc: 'Finish a training module', xp: 300, tone: 'tertiary' },
  { icon: 'celebration', label: 'Community Events', desc: 'Participate in campaigns', xp: 150, tone: 'secondary' },
]

export const boosts = [
  { icon: 'speed', label: 'Processing Speed', type: 'Temporary', cost: 400, desc: '+15% task throughput for 24h', tone: 'primary' },
  { icon: 'dataset', label: 'Data Task Limit', type: 'Temporary', cost: 350, desc: '+10 daily tasks for 48h', tone: 'tertiary' },
  { icon: 'psychology', label: 'Learning Speed', type: 'Permanent', cost: 1200, desc: 'Training completes 20% faster', tone: 'secondary' },
  { icon: 'memory', label: 'Memory Capacity', type: 'Permanent', cost: 1500, desc: '+2 GB AI memory vault', tone: 'primary' },
  { icon: 'bolt', label: 'Reward Multiplier', type: 'Event', cost: 800, desc: '1.5× XP during campaigns', tone: 'tertiary' },
  { icon: 'rocket_launch', label: 'Deployment Priority', type: 'Temporary', cost: 900, desc: 'Front of the queue for 7 days', tone: 'secondary' },
]

export const marketplaceCategories = [
  'All', 'AI Skills', 'Language Packs', 'Robot Upgrades', 'Industry Modules', 'Voice Packs', 'Developer Apps',
]

export const marketplaceItems = [
  { name: 'Yoruba Language Pack', dev: 'WRS Labs', price: '$12', rating: 4.9, cat: 'Language Packs', icon: 'translate', tone: 'tertiary', state: 'Install' },
  { name: 'Warehouse Ops Module', dev: 'NorthChain', price: '$34', rating: 4.7, cat: 'Industry Modules', icon: 'inventory_2', tone: 'primary', state: 'Buy' },
  { name: 'Quantum Core v1.4', dev: 'WRS Labs', price: '$59', rating: 4.8, cat: 'Robot Upgrades', icon: 'memory', tone: 'secondary', state: 'Update' },
  { name: 'Calm Voice Profile', dev: 'Sonora AI', price: '$8', rating: 4.5, cat: 'Voice Packs', icon: 'record_voice_over', tone: 'tertiary', state: 'Buy' },
  { name: 'Vision Labeling Suite', dev: 'Optiq', price: '$21', rating: 4.6, cat: 'AI Skills', icon: 'visibility', tone: 'primary', state: 'Buy' },
  { name: 'Fleet Analytics Pro', dev: 'Meridian', price: '$45', rating: 4.9, cat: 'Developer Apps', icon: 'analytics', tone: 'secondary', state: 'Buy' },
]

export const courses = [
  { title: 'Neural Interface Calibration III', level: 'Expert', duration: '9h 20m', xp: 300, progress: 72, cat: 'Robotics AI' },
  { title: 'Introduction to Robotics', level: 'Beginner', duration: '4h 10m', xp: 200, progress: 100, cat: 'Robotics AI' },
  { title: 'Data Annotation Fundamentals', level: 'Beginner', duration: '3h 45m', xp: 200, progress: 40, cat: 'Data' },
  { title: 'Local Language AI', level: 'Intermediate', duration: '6h 00m', xp: 300, progress: 0, cat: 'Data' },
  { title: 'Computer Vision Essentials', level: 'Intermediate', duration: '7h 30m', xp: 300, progress: 12, cat: 'Robotics AI' },
  { title: 'Robot Maintenance', level: 'Intermediate', duration: '5h 15m', xp: 250, progress: 0, cat: 'Hardware' },
  { title: 'Cybersecurity for Robotics', level: 'Advanced', duration: '8h 05m', xp: 350, progress: 0, cat: 'Security' },
  { title: 'Entrepreneurship with AI', level: 'Beginner', duration: '2h 50m', xp: 150, progress: 0, cat: 'Business' },
]

export const communityEvents = [
  { title: 'Daily WRS Community Sync', when: 'Today · 18:00 WAT', type: 'Meeting', attendees: 842, icon: 'groups' },
  { title: 'Data Quality Masterclass', when: 'Tomorrow · 16:00 WAT', type: 'Training', attendees: 311, icon: 'school' },
  { title: 'Global Annotation Challenge', when: 'Fri · 12:00 UTC', type: 'Challenge', attendees: 1290, icon: 'emoji_events' },
  { title: 'Ambassador Roundtable', when: 'Sat · 15:00 WAT', type: 'Event', attendees: 96, icon: 'campaign' },
]

export const leaderboard = [
  { rank: 1, name: 'Amaka O.', xp: 41250, tone: 'tertiary' },
  { rank: 2, name: 'Kwame B.', xp: 38700, tone: 'secondary' },
  { rank: 3, name: 'Leila R.', xp: 33120, tone: 'primary' },
  { rank: 4, name: 'David Johnson', xp: 12450, tone: 'primary', you: true },
  { rank: 5, name: 'Tunde A.', xp: 11980, tone: 'outline' },
]

export const notifications = [
  { cat: 'Robot Activity', text: 'Your robot has completed 24 tasks.', time: '10m', icon: 'smart_toy', tone: 'primary', unread: true },
  { cat: 'Data Task', text: 'Your voice dataset has been approved.', time: '1h', icon: 'verified', tone: 'tertiary', unread: true },
  { cat: 'Deployment', text: 'Your deployment request was accepted.', time: '3h', icon: 'rocket_launch', tone: 'secondary', unread: true },
  { cat: 'Earnings', text: 'Your event code reward has been added.', time: '6h', icon: 'workspace_premium', tone: 'primary', unread: false },
  { cat: 'Community Event', text: 'A new language training mission is available.', time: '1d', icon: 'translate', tone: 'tertiary', unread: false },
  { cat: 'Wallet', text: 'Your withdrawal request is being reviewed.', time: '2d', icon: 'account_balance_wallet', tone: 'secondary', unread: false },
]

export const qualityScores = [
  { label: 'Accuracy', value: 96 },
  { label: 'Completeness', value: 92 },
  { label: 'Consistency', value: 89 },
  { label: 'Language Quality', value: 94 },
  { label: 'Annotation Quality', value: 91 },
  { label: 'Review Approval', value: 97 },
]

export const activeDeployment = {
  industry: 'Logistics & Warehousing',
  role: 'Warehouse Assistant',
  client: 'NorthChain Distribution',
  location: 'Lagos Hub 4',
  started: '14 Jul 2025',
  duration: '90 days',
  status: 'Working',
  hours: 148,
  tasks: 1284,
  success: 97,
  productivity: 92,
  rating: 4.8,
  safety: 99,
  revenue: '$412.60',
  deductions: '$92.40',
  net: '$320.20',
}

export const languages = [
  { name: 'English', level: 'Fluent', progress: 100 },
  { name: 'Yoruba', level: 'Advanced', progress: 78 },
  { name: 'Hausa', level: 'Intermediate', progress: 52 },
  { name: 'Igbo', level: 'Intermediate', progress: 44 },
  { name: 'Swahili', level: 'Beginner', progress: 21 },
  { name: 'French', level: 'Beginner', progress: 16 },
  { name: 'Arabic', level: 'Locked', progress: 0 },
  { name: 'Portuguese', level: 'Locked', progress: 0 },
]

export const palettes = [
  { name: 'Oceania Flow', colors: ['#E1E2E7', '#00DBE7', '#2D5BFF'], state: 'Applied' },
  { name: 'Neon Genesis', colors: ['#FFB4AB', '#DDB7FF', '#111417'], state: 'Locked — LVL 15' },
  { name: 'Empire Gold', colors: ['#FFD700', '#000000', '#FFFFFF'], state: 'Marketplace' },
  { name: 'Deep Carbon', colors: ['#37393D', '#8E90A2', '#00DBE7'], state: 'Owned' },
]

export const personalities = [
  { name: 'Logical', icon: 'psychology' },
  { name: 'Empathetic', icon: 'volunteer_activism' },
  { name: 'Aggressive', icon: 'bolt' },
  { name: 'Protective', icon: 'verified_user' },
]
