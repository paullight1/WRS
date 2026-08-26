# WRS Supabase Authentication Email Templates

These files are standalone HTML bodies for the hosted Supabase Dashboard. They use the WRS product palette and only official Supabase Auth template variables.

## Paste map

Open **Supabase Dashboard → Authentication → Emails → Templates**, select the matching row, paste the complete file into **Message body**, set the subject, then save.

| Supabase template    | Subject                                      | HTML resource               |
| -------------------- | -------------------------------------------- | --------------------------- |
| Confirm sign up      | `Confirm your WRS email`                     | `confirm-signup.html`       |
| Invite user          | `You’re invited to World Robotic System`     | `invite-user.html`          |
| Magic link or OTP    | `Your secure WRS sign-in`                    | `magic-link-or-otp.html`    |
| Change email address | `Confirm your new WRS email`                 | `change-email-address.html` |
| Reset password       | `Reset your WRS password`                    | `reset-password.html`       |
| Reauthentication     | `{{ .Token }} is your WRS verification code` | `reauthentication.html`     |

## Required configuration

1. Set the production **Site URL** under **Authentication → URL Configuration**.
2. Add the exact development, preview, and production callback URLs to the redirect allowlist.
3. Connect the verified WRS authentication domain through Resend SMTP.
4. Disable click tracking and open tracking for authentication mail in Resend. Rewritten links can break Supabase confirmation URLs.
5. Send a real test for every flow. Confirm both the visible action and the fallback URL/code work.

## Template behavior

- Signup uses `{{ .Token }}` because the current WRS verification screen expects a six-digit code.
- Magic-link mail includes both `{{ .ConfirmationURL }}` and `{{ .Token }}` so a user can choose the supported sign-in method.
- Invite, email-change, and password-recovery messages use `{{ .ConfirmationURL }}`.
- Reauthentication uses the one-time `{{ .Token }}` nonce.
- User metadata is intentionally excluded from authentication mail.

## Test checklist

- Gmail web and mobile
- Outlook web or desktop
- iPhone Mail or another iOS client
- Android mail client
- Images disabled (the design does not depend on images)
- Narrow mobile viewport
- Dark and light client modes
- Expired and already-used links/codes

Never paste Resend or Supabase secret keys into these templates.
