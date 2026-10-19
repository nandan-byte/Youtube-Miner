const { getSetting } = require('./db');

function getAiConfig() {
  const apiKey = getSetting('grok_api_key', process.env.GROK_API_KEY || process.env.GROQ_API_KEY || '');
  const apiBase = getSetting('grok_api_base', process.env.GROK_API_BASE || 'https://api.groq.com/openai/v1');
  const model = getSetting('grok_model', process.env.GROK_MODEL || 'openai/gpt-oss-120b');

  return { apiKey: apiKey.trim(), apiBase: apiBase.trim(), model: model.trim() };
}

async function parseNaturalLanguageIntent(userPrompt) {
  if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
    return { success: false, error: 'Please provide test instructions for the AI to parse.' };
  }

  const { apiKey, apiBase, model } = getAiConfig();

  if (!apiKey) {
    return {
      success: false,
      error: 'AI API Key is not configured. Please add your Groq/Grok API key in Settings or .env.'
    };
  }

  const cleanBase = apiBase.replace(/\/+$/, '');
  const url = `${cleanBase}/chat/completions`;

  const systemMessage = `You are a specialized AI assistant for a YouTube Playback Testing application.
Your job is to parse the user's natural language test request into validated JSON parameters.

Rules:
1. Extract the YouTube URL if present (or null if none mentioned).
2. Extract the number of test repetitions (integer between 1 and 20). If not specified, default to 1.
3. Extract the playback duration in seconds (integer between 5 and 300). If not specified, default to 15.
4. If the user mentions minutes, convert to seconds.
5. Provide a short friendly summary note in "notes".
6. You MUST respond ONLY with a raw JSON object and nothing else. No markdown wrapping, no code blocks.

JSON schema:
{
  "url": string | null,
  "repetitions": number,
  "duration": number,
  "notes": string
}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr = errText;
      try {
        const jsonErr = JSON.parse(errText);
        parsedErr = jsonErr.error?.message || errText;
      } catch (e) {}
      return {
        success: false,
        error: `AI API returned status ${response.status}: ${parsedErr}`
      };
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content;

    if (!rawContent) {
      return { success: false, error: 'AI returned an empty response.' };
    }

    // Clean potential markdown quotes
    const cleaned = rawContent.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate and clamp numbers
    const repetitions = Math.max(1, Math.min(20, parseInt(parsed.repetitions, 10) || 1));
    const duration = Math.max(5, Math.min(300, parseInt(parsed.duration, 10) || 15));

    return {
      success: true,
      data: {
        url: parsed.url || null,
        repetitions,
        duration,
        notes: parsed.notes || 'Configured via AI Assistant'
      }
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to connect to AI API: ${err.message}`
    };
  }
}

async function testAiConnection() {
  const { apiKey, apiBase, model } = getAiConfig();

  if (!apiKey) {
    return { success: false, error: 'No API Key set.' };
  }

  const cleanBase = apiBase.replace(/\/+$/, '');
  const url = `${cleanBase}/chat/completions`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Respond with "OK"' }],
        max_tokens: 5
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `API status ${response.status}: ${text}` };
    }

    return { success: true, message: `Connected successfully to ${model}!` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  getAiConfig,
  parseNaturalLanguageIntent,
  testAiConnection
};
