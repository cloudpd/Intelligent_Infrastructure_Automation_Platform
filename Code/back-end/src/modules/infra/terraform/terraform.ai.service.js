const SBG_BASE_URL = process.env.SBG_BASE_URL || 'http://apiaccess.iti.net.eg/api/v1';
const SBG_API_KEY = process.env.SBG_API_KEY;
const SBG_MODEL_ID = process.env.SBG_MODEL_ID;

async function callGateway(messages) {
  const response = await fetch(`${SBG_BASE_URL}/student/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SBG_API_KEY}`,
    },
    body: JSON.stringify({
      model_id: SBG_MODEL_ID,
      messages,
      system_prompt:
        'You are a Terraform and AWS expert. Analyze the raw Terraform error output and reply with ONLY a concise plain-text explanation (no JSON, no markdown). Include: 1) What went wrong (root cause), 2) How to fix it. Keep it under 500 characters.',
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const message = errBody.error?.message || errBody.message || 'AI gateway request failed';
    throw new Error(message);
  }

  return response.json();
}

function extractText(gatewayResponse) {
  if (typeof gatewayResponse === 'string') return gatewayResponse;

  if (gatewayResponse?.status && gatewayResponse.status !== 'active') {
    throw new Error(`AI gateway returned non-active status: ${gatewayResponse.status}`);
  }

  const candidate =
    gatewayResponse?.output_text ??
    gatewayResponse?.choices?.[0]?.message?.content ??
    gatewayResponse?.choices?.[0]?.text ??
    gatewayResponse?.message?.content ??
    gatewayResponse?.output?.[0]?.content?.[0]?.text ??
    gatewayResponse?.response ??
    gatewayResponse?.result ??
    gatewayResponse?.data?.text ??
    gatewayResponse?.data?.content ??
    gatewayResponse?.text ??
    gatewayResponse?.content;

  if (typeof candidate === 'string') return candidate;

  throw new Error('AI gateway returned an unrecognized response format');
}

/**
 * Sends the raw terraform error to the AI gateway and returns a
 * human-readable summary. On any failure (gateway down, bad response,
 * timeout) returns the original raw error so the user always sees
 * something.
 */
async function simplifyTerraformError(rawError) {
  if (!SBG_API_KEY || !SBG_MODEL_ID) return rawError;
  if (!rawError || rawError.trim().length === 0) return rawError;

  try {
    const gatewayResponse = await callGateway([
      {
        role: 'user',
        content: `Simplify this Terraform error for the user. Explain the root cause and how to fix it:\n\n${rawError}`,
      },
    ]);
    const text = extractText(gatewayResponse);
    return text?.trim() || rawError;
  } catch (err) {
    console.error('AI error simplification failed, returning raw error:', err.message);
    return rawError;
  }
}

module.exports = { simplifyTerraformError };
