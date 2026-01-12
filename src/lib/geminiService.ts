const apiKey = import.meta.env.VITE_GEMINI_API_KEY

export interface ExtractedJob {
    date: string | null
    lot_number: string | null
    company_name: string | null
    address: string | null
    assets: string | null
    comments: string | null
    contact_name: string | null
    contact_detail: string | null
}

const EXTRACTION_PROMPT = `You are a data extraction AI for a logistics company. Extract job information from unstructured text.

IMPORTANT RULES:
1. IGNORE these fields completely: "fml", "no quote", "secure", and person names like "donna", "janice", "casey", "brian", "kyle", "greg"
2. Each job block starts with a date in format M/D/YYYY
3. Extract ONLY these fields:
   - date: Job date (M/D/YYYY format)
   - lot_number: Usually a 6-digit number
   - company_name: Company name (usually in UPPERCASE)
   - address: Full address including street, city, province, postal code
   - assets: Asset descriptions with quantities (e.g., "desktops - 37, chromebooks- 35")
   - comments: Special instructions or notes (NOT metadata like "fml" or person names)
   - contact_name: Contact person name
   - contact_detail: Phone number or email

Return ONLY valid JSON array with this exact structure:
[
  {
    "date": "1/9/2026",
    "lot_number": "226552",
    "company_name": "NORTHEREN SS",
    "address": "851 MOUNT PLEASENT RD, TORONTO, ON CA M4P2L5",
    "assets": "desktops - 37, chromebooks- 35, monitors- 25, printers - 6",
    "comments": "50 boxes of misc",
    "contact_name": "greg",
    "contact_detail": "416 859 1883"
  }
]

If a field is not found, use null. Do NOT include any markdown formatting, just pure JSON.`

export async function extractJobsWithGemini(rawText: string): Promise<ExtractedJob[]> {
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error('Gemini API key not configured')
    }

    try {
        // 1. DYNAMICALLY FIND AVAILABLE MODELS
        // We check v1beta which usually lists all available models
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)

        if (!listResponse.ok) {
            const err = await listResponse.json()
            throw new Error(`Failed to list models: ${err.error?.message || listResponse.statusText}`)
        }

        const listData = await listResponse.json()
        const availableModels = listData.models || []

        // Find first model that supports generateContent and is a gemini model
        const usableModel = availableModels.find((m: any) =>
            m.name.includes('gemini') &&
            m.supportedGenerationMethods?.includes('generateContent')
        )

        if (!usableModel) {
            console.warn('No specific Gemini model found, falling back to gemini-1.5-flash-latest')
        }

        // Use the found model name (e.g. "models/gemini-1.5-flash") or fallback
        const modelName = usableModel ? usableModel.name : 'models/gemini-1.5-flash-latest'
        // Ensure we don't double prefix "models/"
        const cleanModelName = modelName.replace('models/', '')

        console.log(`Using dynamically selected model: ${cleanModelName}`)

        // 2. CALL THE API WITH THE FOUND MODEL
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName}:generateContent?key=${apiKey}`

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${EXTRACTION_PROMPT}\n\nEXTRACT FROM THIS TEXT:\n\n${rawText}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 8192,
                }
            })
        })

        if (!response.ok) {
            const errorData = await response.json()
            // If dynamic/beta failed, try one last desperation shot with v1 and gemini-pro
            if (cleanModelName !== 'gemini-pro') {
                console.log("Primary attempt failed, trying fallback to v1/gemini-pro...")
                return extractFallback(rawText)
            }
            throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`)
        }

        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!text) {
            throw new Error('No response from Gemini API')
        }

        // Clean up response
        const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

        const jobs = JSON.parse(cleanedText)
        return jobs
    } catch (error) {
        console.error('Gemini extraction error:', error)
        throw error
    }
}

// Fallback for v1 endpoint
async function extractFallback(rawText: string) {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `${EXTRACTION_PROMPT}\n\nEXTRACT FROM THIS TEXT:\n\n${rawText}` }] }]
        })
    })
    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Fallback failed')
    return JSON.parse(text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim())
}

export function isGeminiConfigured(): boolean {
    return apiKey !== undefined && apiKey !== 'your_gemini_api_key_here'
}
