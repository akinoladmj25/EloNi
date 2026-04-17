import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@/lib/anthropic'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI features not configured' }, { status: 503 })
  }

  const formData = await req.formData()
  const file = formData.get('receipt') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const mediaType = (file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp') || 'image/jpeg'

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: `Extract the expense details from this receipt. Return ONLY a JSON object with these fields:
{
  "description": "merchant name and what was purchased (brief, max 60 chars)",
  "amount": 0.00,
  "category": one of ["Software","Travel","Office","Marketing","Equipment","Meals","Professional","Other"],
  "date": "YYYY-MM-DD or empty string if not visible"
}
If you cannot determine a value, use an empty string for text or 0 for amount. Return only the JSON, no other text.`,
          },
        ],
      },
    ],
  })

  try {
    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const parsed = JSON.parse(text.trim())
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Could not parse receipt' }, { status: 422 })
  }
}
