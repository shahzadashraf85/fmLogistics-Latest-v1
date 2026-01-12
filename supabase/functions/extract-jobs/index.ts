import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { text, source_type } = await req.json()
        const apiKey = Deno.env.get('GOOGLE_API_KEY')

        if (!apiKey) {
            throw new Error('GOOGLE_API_KEY is not set')
        }

        // Call Google Gemini API
        const prompt = `
      Extract job information from the following text into a STRICT JSON ARRAY.
      Fields per object: job_date (YYYY-MM-DD), lot_no, company_name, assets, comments, contact_name, contact_detail.
      If a field is missing, use null.
      Return ONLY valid JSON array. No markdown formatting.
      
      Text:
      ${text.substring(0, 30000)} -- Truncate limit
    `

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            }
        )

        const data = await response.json()

        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error('Gemini returned empty response')
        }

        let rawJson = data.candidates[0].content.parts[0].text
        // Clean up markdown code blocks if present
        rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim()

        let extractedData
        try {
            extractedData = JSON.parse(rawJson)
            if (!Array.isArray(extractedData)) {
                // Try to wrap or search for array
                extractedData = [extractedData]
            }
        } catch (e) {
            throw new Error('Failed to parse AI response as JSON: ' + rawJson)
        }

        // Initialize Supabase Client to save to DB (Server-side to ensure integrity)
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        // specific user from auth context (passed by client key)
        const authHeader = req.headers.get('Authorization')!
        const userClient = createClient(supabaseUrl, authHeader.replace('Bearer ', ''), { global: { headers: { Authorization: authHeader } } })
        const { data: { user } } = await userClient.auth.getUser()

        if (!user) throw new Error('Unauthorized')

        // Create Batch
        const { data: batch, error: batchError } = await supabase
            .from('job_import_batches')
            .insert({
                source_type: source_type || 'text',
                raw_text: text,
                created_by: user.id
            })
            .select()
            .single()

        if (batchError) throw batchError

        // Insert Rows
        const rows = extractedData.map((item: any) => ({
            batch_id: batch.id,
            extracted: item,
            is_selected: true
        }))

        const { error: rowsError } = await supabase
            .from('job_import_rows')
            .insert(rows)

        if (rowsError) throw rowsError

        return new Response(
            JSON.stringify({ batchId: batch.id, count: rows.length }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
