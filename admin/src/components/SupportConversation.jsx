import { useState } from 'react'
import { browserAccountClient } from '../../../src/infrastructure/account/browserAccountClient.ts'
import { displayValue } from '../lib/operations.js'

export default function SupportConversation({ row }) {
  const [messages, setMessages] = useState(row.messages)
  const [cursor, setCursor] = useState(null)
  const [more, setMore] = useState(Boolean(row.messages_truncated) || !Array.isArray(row.messages))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function load() {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const page = await browserAccountClient.supportThread(row.id, cursor)
      if (!Array.isArray(page.messages)) throw new Error('Messages could not be loaded.')
      setMessages((current) =>
        cursor
          ? [...page.messages, ...(current || [])].filter(
              (message, index, all) => all.findIndex((other) => other.id === message.id) === index,
            )
          : page.messages,
      )
      setCursor(page.before)
      setMore(page.hasMore)
    } catch (failure) {
      setError(failure.message || 'Messages could not be loaded. Try again.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <section className="admin-record-content" aria-label="Conversation">
      <h3>Conversation</h3>
      {Array.isArray(messages) ? (
        messages.length ? (
          <ol className="admin-conversation">
            {messages.map((message, index) => (
              <li key={message.id || index} className={message.author_role === 'operator' ? 'is-staff' : ''}>
                <div>
                  <strong>
                    {message.author_name ||
                      message.actor_name ||
                      (message.author_role === 'operator'
                        ? 'Support team'
                        : message.author_role === 'system'
                          ? 'System'
                          : row.user_name || 'User')}
                  </strong>
                  <time>{displayValue('date', message.created_at)}</time>
                </div>
                <p>{message.body}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="admin-muted">No messages yet.</p>
        )
      ) : (
        <p className="admin-muted">Load the conversation to read this ticket.</p>
      )}
      {more && (
        <button className="admin-btn" disabled={loading} onClick={load}>
          {loading ? 'Loading messages…' : cursor ? 'Load earlier messages' : 'Load conversation'}
        </button>
      )}
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
