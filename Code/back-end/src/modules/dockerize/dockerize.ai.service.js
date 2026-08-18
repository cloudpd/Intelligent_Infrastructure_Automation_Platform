const Anthropic = require('@anthropic-ai/sdk');
const Joi = require('joi');
const AppError = require('../../core/utils/AppError');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Same strict shape discussed earlier — this is the contract the AI's
// output MUST satisfy before it's ever allowed near dockerize.templates.js
const suggestionSchema = Joi.object({
  base_image: Joi.string()
    .pattern(/^[a-z0-9]+([._-][a-z0-9]+)*(\/[a-z0-9]+([._-][a-z0-9]+)*)*(:[\w][\w.-]{0,127})?$/)
    .max(256)
    .required(),
  port: Joi.number().integer().min(1).max(65535).required(),
  run_command: Joi.string().pattern(/^[\w./ -]+$/).max(256).required(), // no quotes, no newlines
  language: Joi.string().valid('node', 'python').required(),
});

async function suggestDockerConfig({ packageJson, requirementsTxt, fileList }) {
  const prompt = `Given this repo's files, respond with ONLY a JSON object:
{"language":"node|python","base_image":"...","port":number,"run_command":"..."}

Top-level files: ${fileList.join(', ')}
package.json: ${packageJson || 'none'}
requirements.txt: ${requirementsTxt || 'none'}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content.find((b) => b.type === 'text')?.text || '';
  return validateOrRetry(raw, prompt);
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

  if (!error) return value; // trusted, schema-conformant — safe to hand to the form

  if (attempted) {
    // Give up — never guess/coerce. Let the user fill the form manually instead.
    throw new AppError('Could not generate a valid suggestion — please fill the form manually', 422);
  }

  // One retry, feeding the validation error back to the model
  const retryResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [
      { role: 'user', content: originalPrompt },
      { role: 'assistant', content: raw },
      { role: 'user', content: `That was invalid: ${error.message}. Reply with ONLY the corrected JSON.` },
    ],
  });
  const retryText = retryResponse.content.find((b) => b.type === 'text')?.text || '';
  return validateOrRetry(retryText, originalPrompt, true);
}

module.exports = { suggestDockerConfig };