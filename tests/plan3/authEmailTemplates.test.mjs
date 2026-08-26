import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const templateDirectory = new URL('../../Docs/auth-email-templates/', import.meta.url)

const templates = {
  'confirm-signup.html': ['{{ .Token }}'],
  'invite-user.html': ['{{ .ConfirmationURL }}'],
  'magic-link-or-otp.html': ['{{ .ConfirmationURL }}', '{{ .Token }}'],
  'change-email-address.html': ['{{ .ConfirmationURL }}', '{{ .NewEmail }}'],
  'reset-password.html': ['{{ .ConfirmationURL }}'],
  'reauthentication.html': ['{{ .Token }}'],
}

for (const [filename, requiredVariables] of Object.entries(templates)) {
  test(`${filename} is a safe, branded Supabase authentication email`, () => {
    const html = fs.readFileSync(new URL(filename, templateDirectory), 'utf8')

    assert.match(html, /World Robotic System/)
    assert.match(html, /role="presentation"/)
    assert.match(html, /If you did not request|If you weren't expecting/)
    assert.doesNotMatch(html, /<(script|form|iframe)\b/i)
    assert.doesNotMatch(html, /<(img|link)\b[^>]*(src|href)="https?:/i)
    assert.doesNotMatch(html, /{{\s*\.Data\b/)

    for (const variable of requiredVariables) assert.ok(html.includes(variable), `${filename} must include ${variable}`)
  })
}
