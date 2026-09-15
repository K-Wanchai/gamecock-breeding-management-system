import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

function crc16(str: string): number {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff
      else crc = (crc << 1) & 0xffff
    }
  }
  return crc
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('66')) return '0066' + digits.slice(2)
  if (digits.startsWith('0')) return '0066' + digits.slice(1)
  return '0066' + digits
}

function buildPromptPayPayload(phone: string, amount: number): string {
  const proxy = normalizePhone(phone)
  const aid = 'A000000677010111'
  // Subtag 00 = AID (16 chars), Subtag 01 = phone proxy
  const merchantInfo = `0016${aid}01${String(proxy.length).padStart(2, '0')}${proxy}`
  const tag29 = `29${String(merchantInfo.length).padStart(2, '0')}${merchantInfo}`
  const amountStr = amount.toFixed(2)
  const amountTag = `54${String(amountStr.length).padStart(2, '0')}${amountStr}`
  const payload = `000201010212${tag29}5303764${amountTag}5802TH6304`
  const checksum = crc16(payload).toString(16).toUpperCase().padStart(4, '0')
  return payload + checksum
}

interface PromptPayQRProps {
  phone: string
  amount: number
  size?: number
}

export function PromptPayQR({ phone, amount, size = 200 }: PromptPayQRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !phone) return
    const payload = buildPromptPayPayload(phone, amount)
    QRCode.toCanvas(canvasRef.current, payload, {
      width: size,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })
  }, [phone, amount, size])

  return <canvas ref={canvasRef} className="rounded-md" />
}
