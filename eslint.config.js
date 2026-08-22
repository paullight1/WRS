import js from '@eslint/js'
import jsxA11y from '@htmlacademy/eslint-plugin-jsx-a11y'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const productionFiles = [
  'api/**/*.js',
  'server/**/*.js',
  'src/lib/**/*.{js,mjs}',
  'src/domain/**/*.{js,mjs,ts}',
  'src/services/**/*.{js,mjs,ts}',
  'src/infrastructure/**/*.{js,mjs,ts}',
  'src/components/{auth,robot,data}/**/*.{js,jsx}',
  'src/components/AppShell.jsx',
  'src/screens/{Login,Register,Verify,ForgotPassword,ResetPassword,SecuritySettings,Onboarding,Customize,RobotPassport,Home,MyRobot,More,Profile,Settings,Checkout,PaymentSuccess,Wallet,Transactions,TrainingModule,DataTask,DataRevenue,Deploy,DeploymentDetails,ActiveDeployment,DeployProduction,DeploymentDetailsProduction,ActiveDeploymentProduction}.jsx',
  'src/App.jsx',
  'tests/**/*.{js,mjs,jsx,ts,tsx}',
]

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  {
    files: productionFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['src/domain/**/*.ts', 'src/services/**/*.ts', 'src/infrastructure/**/*.ts', 'tests/**/*.ts'],
  })),
]
