const Joi = require('joi');
const AppError = require('../../core/utils/AppError');

const SBG_BASE_URL = process.env.SBG_BASE_URL || 'http://apiaccess.iti.net.eg/api/v1';
const SBG_API_KEY = process.env.SBG_API_KEY;
const SBG_MODEL_ID = process.env.SBG_MODEL_ID; // e.g. "openai.gpt-oss-20b" — whatever your dashboard approves

// Same strict shape as before — this is the contract the AI's output MUST
// satisfy before it's ever allowed near dockerize.templates.js
const suggestionSchema = Joi.object({
  base_image: Joi.string()
    .pattern(/^[a-z0-9]+([._-][a-z0-9]+)*(\/[a-z0-9]+([._-][a-z0-9]+)*)*(:[\w][\w.-]{0,127})?$/)
    .max(256)
    .required(),
  port: Joi.number().integer().min(1).max(65535).required(),
  run_command: Joi.string().pattern(/^[\w./ -]+$/).max(256).required(),
  language: Joi.string().valid('node', 'python').required(),
});

async function callGateway(messages) {
  if (!SBG_API_KEY) throw new AppError('SBG_API_KEY is not configured', 500);
  if (!SBG_MODEL_ID) throw new AppError('SBG_MODEL_ID is not configured', 500);

  const response = await fetch(`${SBG_BASE_URL}/student/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SBG_API_KEY}`,
    },
    body: JSON.stringify({
      model_id: SBG_MODEL_ID,
      messages,
      system_prompt: 'You generate Docker configuration suggestions. Reply with ONLY a JSON object, no prose.',
    }),
    signal: AbortSignal.timeout(120000), // matches the 120s timeout in their own sample
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const message = errBody.error?.message || errBody.message || 'AI gateway request failed';
    throw new AppError(message, response.status);
  }

  return response.json();
}

// Confirmed shape (verified against the real SBG gateway, deepseek.v3.2, 200 OK):
// {
//   "request_id": "...",
//   "model_id": "deepseek.v3.2",
//   "region": "us-east-2",
//   "output_text": "{\"ok\":true}",
//   "usage": { ... },
//   "estimated_cost_usd": "...",
//   "actual_cost_usd": "...",
//   "status": "active"
// }
// The fallbacks below are kept only as a safety net in case a different
// model_id on this same gateway ever responds with a different shape.
function extractText(gatewayResponse) {
  if (typeof gatewayResponse === 'string') {
    return gatewayResponse;
  }

  if (gatewayResponse?.status && gatewayResponse.status !== 'active') {
    throw new AppError(`AI gateway returned non-active status: ${gatewayResponse.status}`, 502);
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

  if (typeof candidate === 'string') {
    return candidate;
  }

  console.error('Unrecognized AI gateway response shape:', JSON.stringify(gatewayResponse, null, 2));
  throw new AppError('AI gateway returned an unrecognized response format — check server logs', 500);
}

async function suggestDockerConfig({ packageJson, requirementsTxt, pyprojectToml, pipfile, setupPy, fileList }) {
  // If NOTHING was actually found in the repo, there is zero evidence to
  // reason from. Don't send this to the model — it will happily hallucinate
  // a confident-looking but ungrounded guess (e.g. defaulting to Node for a
  // Python repo). Fail fast instead.
  if (!fileList || fileList.length === 0) {
    throw new AppError(
      'Could not detect a project language — no package.json, requirements.txt, pyproject.toml, Pipfile, or setup.py found. Please fill the form manually.',
      422
    );
  }

  const userPrompt = `Given this repo's files, respond with ONLY a JSON object:
{"language":"node|python","base_image":"...","port":number,"run_command":"..."}

Top-level files: ${fileList.join(', ')}
package.json: ${packageJson || 'none'}
requirements.txt: ${requirementsTxt || 'none'}
pyproject.toml: ${pyprojectToml || 'none'}
Pipfile: ${pipfile || 'none'}
setup.py: ${setupPy || 'none'}`;

  const gatewayResponse = await callGateway([{ role: 'user', content: userPrompt }]);
  const raw = extractText(gatewayResponse);
  return validateOrRetry(raw, userPrompt);
}

async function validateOrRetry(raw, originalPrompt, attempted = false) {
  let parsed;
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch {
    parsed = null;
  }

  const { error, value } = parsed
    ? suggestionSchema.validate(parsed)
    : { error: { message: 'not valid JSON' } };

  if (!error) return value;

  if (attempted) {
    throw new AppError('Could not generate a valid suggestion — please fill the form manually', 422);
  }

  const gatewayResponse = await callGateway([
    { role: 'user', content: originalPrompt },
    { role: 'assistant', content: raw },
    { role: 'user', content: `That was invalid: ${error.message}. Reply with ONLY the corrected JSON.` },
  ]);
  const retryText = extractText(gatewayResponse);
  return validateOrRetry(retryText, originalPrompt, true);
}

module.exports = { suggestDockerConfig };