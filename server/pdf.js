function ascii(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '?')
}

function escapePdfText(value) {
  return ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function wrap(value, width = 88) {
  const words = ascii(value).split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''
  for (const word of words) {
    if (!current) {
      current = word
      continue
    }
    if (`${current} ${word}`.length <= width) current += ` ${word}`
    else {
      lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function pdfDocument(lines, title) {
  const visible = lines.flatMap((line) => wrap(line)).slice(0, 48)
  const stream = [
    'BT',
    '/F1 11 Tf',
    '50 790 Td',
    '15 TL',
    ...visible.flatMap((line, index) => [`(${escapePdfText(line)}) Tj`, index === visible.length - 1 ? '' : 'T*']),
    'ET',
  ]
    .filter(Boolean)
    .join('\n')

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`,
    `<< /Title (${escapePdfText(title)}) /Author (World Robotic System) /Subject (Verifiable robot passport) /Creator (WRS server passport service) >>`,
  ]

  let pdf = '%PDF-1.7\n%WRS\n'
  const offsets = [0]
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })
  const xref = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(pdf, 'utf8')
}

export function createPassportPdf(passport, verificationUrl) {
  const lines = [
    'WORLD ROBOTIC SYSTEM - VERIFIED ROBOT PASSPORT',
    '',
    `Robot: ${passport.name}`,
    `Robot ID: ${passport.robotId}`,
    `Public verification ID: ${passport.publicVerificationId}`,
    `Class: ${passport.robotClass}`,
    `Package: ${passport.packageSlug}`,
    `Lifecycle: ${passport.lifecycle}`,
    `Activation: ${passport.activationDate}`,
    `Level: ${passport.level}`,
    `Total XP: ${passport.totalXp}`,
    `Passport issued: ${passport.issuedAt}`,
    '',
    'VERIFIED SKILLS',
    ...(passport.skills?.length
      ? passport.skills.map((skill) => `${skill.name} ${skill.version}${skill.verified ? ' - verified' : ''}`)
      : ['No verified skill records.']),
    '',
    'CERTIFICATIONS',
    ...(passport.certifications?.length
      ? passport.certifications.map(
          (certification) =>
            `${certification.name} - ${certification.issuer} - ${certification.status} - ${certification.verificationReference}`,
        )
      : ['No certification records.']),
    '',
    'PUBLIC VERIFICATION',
    verificationUrl,
    '',
    'This document intentionally excludes owner identity, financial records and private event metadata.',
  ]
  return pdfDocument(lines, `WRS Robot Passport - ${passport.name}`)
}
