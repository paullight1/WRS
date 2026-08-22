import { useRef, useState } from 'react'
import { browserDataClient } from '../../infrastructure/data/browserDataClient.ts'
import { Badge, Button, Card, Disclosure } from '../ui.jsx'

const allowedTypes = new Set([
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

export default function SecureFileUpload({ slug }) {
  const inputRef = useRef(null)
  const [consented, setConsented] = useState(false)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const dataCategory = slug === 'conversation' ? 'conversation' : 'document'

  const grantConsent = async () => {
    setBusy(true)
    try {
      await browserDataClient.recordConsent({
        purposeSlug: 'dataset-contribution',
        policyVersion: 1,
        dataCategory,
        action: 'granted',
        context: { surface: 'training-file-upload', module: slug },
      })
      setConsented(true)
      setMessage('Dataset-contribution consent recorded for this data category.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Consent could not be recorded.')
    } finally {
      setBusy(false)
    }
  }

  const choose = (event) => {
    const selected = event.target.files?.[0] || null
    if (!selected) return
    if (selected.size <= 0 || selected.size > 52_428_800) {
      setFile(null)
      setMessage('Files must be between 1 byte and 50 MB.')
      return
    }
    if (!allowedTypes.has(selected.type)) {
      setFile(null)
      setMessage('This file type is not accepted by the private upload policy.')
      return
    }
    setFile(selected)
    setMessage(`${selected.name} selected locally. Nothing has been uploaded yet.`)
  }

  const upload = async () => {
    if (!file || !consented) return
    setBusy(true)
    try {
      const grant = await browserDataClient.createUploadGrant({
        purposeSlug: 'dataset-contribution',
        dataCategory,
        mimeType: file.type,
        sizeBytes: file.size,
      })
      await browserDataClient.uploadToGrant(grant.signedUrl, file, file.type)
      const complete = await browserDataClient.completeUpload(grant.assetId)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      setMessage(
        `Private upload ${complete.assetId} received. It is pending malware/content scanning and cannot be submitted or licensed yet.`,
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Private upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-4 p-card-padding">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge t={consented ? 'tertiary' : 'outline'}>{consented ? 'Contribution consent active' : 'Consent required'}</Badge>
        {!consented && <Button size="sm" loading={busy} onClick={grantConsent}>Grant contribution consent</Button>}
      </div>
      <Disclosure icon="shield">
        Files are uploaded to a server-chosen private object path using a time-limited signed token. PDF, DOCX, CSV, TXT
        and JSON are capped at 50 MB and remain unavailable to review/licensing until the trusted scan is clean.
      </Disclosure>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.csv,.txt,.json,application/pdf,text/plain,text/csv,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={choose}
        disabled={!consented || busy}
        aria-label="Choose private training file"
        className="block w-full text-body-sm text-on-surface-variant file:mr-3 file:rounded-xl file:border-0 file:bg-primary-container/30 file:px-4 file:py-2 file:text-label-md file:text-on-surface"
      />
      {file && <p className="text-body-sm text-on-surface">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>}
      <Button full icon="upload" loading={busy} disabled={!file || !consented} onClick={upload}>Upload privately</Button>
      {message && <p role="status" className="text-body-sm text-on-surface-variant">{message}</p>}
    </Card>
  )
}
