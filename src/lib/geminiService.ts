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

// Reliable models to try in order
const MODELS = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];

export async function extractJobsWithGemini(rawText: string): Promise<ExtractedJob[]> {
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error('Gemini API key not configured')
    }

    let lastError: any;

    const todayStr = new Date().toLocaleDateString('en-US');
    const PROMPT_WITH_CONTEXT = `${EXTRACTION_PROMPT}

CONTEXT:
The current date is ${todayStr}.
RULE: If a job date is not explicitly mentioned in the text, you MUST use "${todayStr}" as the date. DO NOT return null for date.`;

    // Try models in sequence
    for (const model of MODELS) {
        try {
            console.log(`Attempting extraction with model: ${model}`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `${PROMPT_WITH_CONTEXT}\n\nEXTRACT FROM THIS TEXT:\n\n${rawText}` }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 8192,
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                console.warn(`Model ${model} failed:`, errData);
                throw new Error(errData.error?.message || response.statusText);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) throw new Error('No content returned from AI');

            const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(cleanedText);

        } catch (err) {
            console.error(`Attempt with ${model} failed.`, err);
            lastError = err;
            // Continue to next model
        }
    }

    throw new Error(`All AI models failed. Last error: ${lastError?.message || 'Unknown error'}`);
}



export function isGeminiConfigured(): boolean {
    return apiKey !== undefined && apiKey !== 'your_gemini_api_key_here'
}
