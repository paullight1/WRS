import { useRef, useState } from 'react'
import { browserDataClient } from '../../infrastructure/data/browserDataClient.ts'
import { Badge, Button, Card, Disclosure } from '../ui.jsx'

function categoryFor(slug) {
  if (slug === 'voice') return 'voice'
  if (slug === 'movement') return 'movement'
  if (slug === 'facial') return 'face'
  if (slug === 'video-labeling') return 'video'
  return 'image'
}

function preferredMime(category) {
  if (category === 'voice') {
    return MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm' : 'audio/ogg'
  }
  return MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm' : 'video/webm'
}

export default function SensitiveCapture({ slug }) {
  const category = categoryFor(slug)
  const [consented, setConsented] = useState(false)
  const [recording, setRecording] = useState(false)
  const [blob, setBlob] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  const grantConsent = async () => {
    setBusy(true)
    setMessage('')
    try {
      await browserDataClient.recordConsent({
        purposeSlug: 'personal-robot',
        policyVersion: 1,
        dataCategory: category,
        action: 'granted',
        context: { surface: 'training-capture', module: slug },
      })
      setConsented(true)
      setMessage('Consent recorded. You can now start capture.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Consent could not be recorded.')
    } finally {
      setBusy(false)
    }
  }

  const withdrawConsent = async () => {
    if (recording) return
    setBusy(true)
    try {
      await browserDataClient.recordConsent({
        purposeSlug: 'personal-robot',
        policyVersion: 1,
        dataCategory: category,
        action: 'withdrawn',
        context: { surface: 'training-capture', module: slug },
      })
      setConsented(false)
      setMessage('Consent withdrawn. New capture and processing are blocked.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Consent withdrawal could not be recorded.')
    } finally {
      setBusy(false)
    }
  }

  const start = async () => {
    if (!consented) return
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMessage('This browser does not support secure media capture.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        category === 'voice' ? { audio: true, video: false } : { audio: false, video: true },
      )
      const mimeType = preferredMime(category)
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data?.size) chunksRef.current.push(event.data)
      })
      recorder.addEventListener('stop', () => {
        const nextBlob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType })
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setBlob(nextBlob)
        setPreviewUrl(URL.createObjectURL(nextBlob))
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      })
      recorderRef.current = recorder
      streamRef.current = stream
      recorder.start(1000)
      setRecording(true)
      setMessage('Capture is active. Nothing is uploaded until you stop, review and submit it.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Microphone/camera permission was not granted.')
    }
  }

  const stop = () => {
    const recorder = recorderRef.current
    if (recorder?.state === 'recording') recorder.stop()
    setRecording(false)
  }

  const discard = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl('')
    setBlob(null)
    setMessage('Capture discarded locally.')
  }

  const upload = async () => {
    if (!blob || !consented) return
    setBusy(true)
    setMessage('')
    try {
      const grant = await browserDataClient.createUploadGrant({
        purposeSlug: 'personal-robot',
        dataCategory: category,
        mimeType: blob.type || preferredMime(category),
        sizeBytes: blob.size,
      })
      await browserDataClient.uploadToGrant(grant.signedUrl, blob, blob.type || preferredMime(category))
      const result = await browserDataClient.completeUpload(grant.assetId)
      discard()
      setMessage(
        `Encrypted/private upload recorded as ${result.assetId}. Scan status is ${result.scanStatus}; processing remains blocked until the trusted scanner marks it clean.`,
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Capture upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-4 p-card-padding">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge t={consented ? 'tertiary' : 'outline'}>{consented ? 'Consent active' : 'Consent required'}</Badge>
        {consented ? (
          <Button variant="ghost" size="sm" disabled={recording || busy} onClick={withdrawConsent}>
            Withdraw consent
          </Button>
        ) : (
          <Button size="sm" loading={busy} onClick={grantConsent}>
            Review & grant consent
          </Button>
        )}
      </div>

      <Disclosure icon="privacy_tip">
        Consent applies to the <strong>personal-robot</strong> purpose for this {category} capture only. Dataset
        contribution and commercial/research licensing require separate consent records.
      </Disclosure>

      <div className="grid gap-2 sm:grid-cols-2">
        {!recording ? (
          <Button full icon={category === 'voice' ? 'mic' : 'videocam'} disabled={!consented || busy} onClick={start}>
            Start capture
          </Button>
        ) : (
          <Button full variant="danger" icon="stop_circle" onClick={stop}>
            Stop capture
          </Button>
        )}
        <Button full variant="ghost" disabled={!blob || busy || recording} onClick={discard}>
          Delete local capture
        </Button>
      </div>

      {previewUrl && category === 'voice' && <audio controls className="w-full" src={previewUrl} />}
      {previewUrl && category !== 'voice' && <video controls className="max-h-72 w-full rounded-xl" src={previewUrl} />}

      <Button full icon="upload" loading={busy} disabled={!blob || !consented || recording} onClick={upload}>
        Upload reviewed capture
      </Button>
      {message && (
        <p role="status" className="text-body-sm text-on-surface-variant">
          {message}
        </p>
      )}
    </Card>
  )
}
