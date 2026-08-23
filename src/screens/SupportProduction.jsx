import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import StateView from '../components/states/StateView.jsx'
import { Badge, Button, Card, Field, SectionTitle } from '../components/ui.jsx'
import { browserAccountClient } from '../infrastructure/account/browserAccountClient.ts'

const categories = ['account', 'billing', 'wallet', 'deployment', 'data', 'training', 'fraud', 'technical', 'other']

function shortId(value) {
  return value ? `${String(value).slice(0, 8)}…` : 'Unavailable'
}

export default function SupportProduction() {
  const [support, setSupport] = useState({ tickets: [] })
  const [articles, setArticles] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [message, setMessage] = useState('')
  const [selectedTicketId, setSelectedTicketId] = useState('')
  const [reply, setReply] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [form, setForm] = useState({ category: 'technical', subject: '', message: '' })

  const refreshSupport = async () => {
    const next = await browserAccountClient.support()
    setSupport(next)
    if (!selectedTicketId && next.tickets?.[0]?.id) setSelectedTicketId(next.tickets[0].id)
    return next
  }

  useEffect(() => {
    let active = true
    Promise.all([browserAccountClient.support(), browserAccountClient.knowledgeBase('')])
      .then(([supportResult, kbResult]) => {
        if (!active) return
        setSupport(supportResult)
        setArticles(Array.isArray(kbResult.articles) ? kbResult.articles : [])
        if (supportResult.tickets?.[0]?.id) setSelectedTicketId(supportResult.tickets[0].id)
      })
      .catch((reason) => {
        if (active) setMessage(reason instanceof Error ? reason.message : 'Support service is unavailable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const selectedTicket = useMemo(
    () => support.tickets?.find((ticket) => ticket.id === selectedTicketId) || null,
    [selectedTicketId, support.tickets],
  )

  const searchKnowledge = async () => {
    setBusy('search')
    setMessage('')
    try {
      const result = await browserAccountClient.knowledgeBase(query)
      setArticles(Array.isArray(result.articles) ? result.articles : [])
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Knowledge base search failed.')
    } finally {
      setBusy('')
    }
  }

  const createTicket = async () => {
    setBusy('create')
    setMessage('')
    try {
      const result = await browserAccountClient.createTicket(form)
      const ticketId = String(result.ticketId || '')
      if (!ticketId) throw new Error('Support service did not return a ticket reference.')
      if (attachment) {
        const grant = await browserAccountClient.createSupportAttachment({
          ticketId,
          fileName: attachment.name,
          mimeType: attachment.type,
          sizeBytes: attachment.size,
        })
        await browserAccountClient.uploadSupportAttachment(String(grant.signedUrl || ''), attachment, attachment.type)
      }
      await refreshSupport()
      setSelectedTicketId(ticketId)
      setForm({ category: 'technical', subject: '', message: '' })
      setAttachment(null)
      setMessage(`Support case ${shortId(ticketId)} was created from the authoritative ticket service.`)
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Support ticket creation failed.')
    } finally {
      setBusy('')
    }
  }

  const sendReply = async () => {
    if (!selectedTicketId) return
    setBusy('reply')
    setMessage('')
    try {
      await browserAccountClient.addTicketMessage(selectedTicketId, reply)
      setReply('')
      await refreshSupport()
      setMessage('Your reply was appended to the support case.')
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Support reply failed.')
    } finally {
      setBusy('')
    }
  }

  if (loading) {
    return (
      <AppShell title="Support">
        <StateView kind="loading" title="Loading support" desc="Reading your stored support cases and knowledge base." />
      </AppShell>
    )
  }

  return (
    <AppShell title="Support" subtitle="Trackable cases and published guidance">
      <section>
        <SectionTitle>Open a case</SectionTitle>
        <Card className="space-y-4 p-card-padding">
          <label className="block text-label-md text-on-surface-variant">
            Category
            <select
              className="mt-1.5 min-h-11 w-full rounded-xl border border-white/12 bg-surface-container px-3 text-body-md text-on-surface outline-none focus:border-primary"
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="Subject"
            value={form.subject}
            onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
            placeholder="Briefly describe the issue"
          />
          <label className="block text-label-md text-on-surface-variant">
            Message
            <textarea
              rows={5}
              value={form.message}
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-white/12 bg-surface-container px-3.5 py-3 text-body-md text-on-surface outline-none placeholder:text-outline focus:border-primary"
              placeholder="Include the facts an operator needs to investigate."
            />
          </label>
          <label className="block text-label-md text-on-surface-variant">
            Attachment (optional, PDF/TXT/JPG/PNG, max 10 MB)
            <input
              type="file"
              accept="application/pdf,text/plain,image/jpeg,image/png"
              className="mt-2 block w-full text-label-sm text-on-surface-variant"
              onChange={(event) => setAttachment(event.target.files?.[0] || null)}
            />
          </label>
          <Button
            full
            loading={busy === 'create'}
            disabled={!form.subject.trim() || !form.message.trim()}
            onClick={createTicket}
          >
            Submit support case
          </Button>
        </Card>
      </section>

      <section>
        <SectionTitle>Your cases</SectionTitle>
        <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-2">
            {support.tickets?.length ? (
              support.tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`w-full rounded-xl border p-3 text-left ${selectedTicketId === ticket.id ? 'border-primary/50 bg-primary/5' : 'border-white/8 bg-surface-container'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-on-surface">{ticket.subject}</p>
                    <Badge t={ticket.status === 'resolved' || ticket.status === 'closed' ? 'success' : 'outline'}>
                      {ticket.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-label-sm text-outline">
                    {ticket.category} · {shortId(ticket.id)} · {ticket.priority}
                  </p>
                </button>
              ))
            ) : (
              <Card className="p-4 text-body-sm text-on-surface-variant">No support cases yet.</Card>
            )}
          </div>

          <Card className="space-y-3 p-card-padding">
            {selectedTicket ? (
              <>
                <div>
                  <p className="text-title text-on-surface">{selectedTicket.subject}</p>
                  <p className="text-label-sm text-outline">Case {selectedTicket.id}</p>
                </div>
                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {(selectedTicket.messages || []).map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/8 p-3">
                      <p className="text-label-sm text-outline">{item.author_role}</p>
                      <p className="mt-1 whitespace-pre-wrap text-body-sm text-on-surface-variant">{item.body}</p>
                    </div>
                  ))}
                </div>
                {!['resolved', 'closed'].includes(selectedTicket.status) && (
                  <>
                    <label className="block text-label-md text-on-surface-variant">
                      Reply
                      <textarea
                        rows={3}
                        value={reply}
                        onChange={(event) => setReply(event.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-white/12 bg-surface-container px-3.5 py-3 text-body-md text-on-surface outline-none focus:border-primary"
                      />
                    </label>
                    <Button full loading={busy === 'reply'} disabled={!reply.trim()} onClick={sendReply}>
                      Send reply
                    </Button>
                  </>
                )}
              </>
            ) : (
              <p className="text-body-sm text-on-surface-variant">Select a case to view its stored conversation.</p>
            )}
          </Card>
        </div>
      </section>

      <section>
        <SectionTitle>Knowledge base</SectionTitle>
        <Card className="space-y-3 p-card-padding">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <Field label="Search published guidance" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <Button className="sm:self-end" loading={busy === 'search'} onClick={searchKnowledge}>
              Search
            </Button>
          </div>
          <div className="space-y-2">
            {articles.length ? (
              articles.map((article) => (
                <details key={article.id || article.slug} className="rounded-xl border border-white/8 p-3">
                  <summary className="cursor-pointer text-body-md font-medium text-on-surface">{article.title}</summary>
                  <p className="mt-2 text-body-sm text-on-surface-variant">{article.summary}</p>
                  <p className="mt-2 whitespace-pre-wrap text-body-sm text-on-surface-variant">{article.body}</p>
                </details>
              ))
            ) : (
              <p className="text-body-sm text-on-surface-variant">No published articles match this search.</p>
            )}
          </div>
        </Card>
      </section>

      {message && (
        <p role="status" className="rounded-xl border border-white/10 p-3 text-body-sm text-on-surface-variant">
          {message}
        </p>
      )}
    </AppShell>
  )
}
