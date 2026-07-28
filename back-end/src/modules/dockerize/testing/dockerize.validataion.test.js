const {
  existingDockerfileSchema,
  generateDockerfileSchema,
  SUPPORTED_LANGUAGES,
} = require('../dockerize.validation');

const VALID_UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

describe('SUPPORTED_LANGUAGES', () => {
  it('lists node and python', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['node', 'python']);
  });
});

describe('existingDockerfileSchema', () => {
  const validPayload = { service_id: VALID_UUID, dockerfile_path: 'Dockerfile' };

  it('passes with a valid uuid and dockerfile path', () => {
    const { error, value } = existingDockerfileSchema.validate(validPayload);
    expect(error).toBeUndefined();
    expect(value).toEqual(validPayload);
  });

  it('fails with the custom message when service_id is missing', () => {
    const { dockerfile_path } = validPayload;
    const { error } = existingDockerfileSchema.validate({ dockerfile_path });
    expect(error.details[0].message).toBe('Service id is required');
  });

  it('fails with the custom message when service_id is not a valid uuid', () => {
    const { error } = existingDockerfileSchema.validate({ ...validPayload, service_id: 'not-a-uuid' });
    expect(error.details[0].message).toBe('Invalid service id');
  });

  it('fails with the default any.required type when dockerfile_path is missing entirely', () => {
    const { service_id } = validPayload;
    const { error } = existingDockerfileSchema.validate({ service_id });
    expect(error.details[0].type).toBe('any.required');
  });

  it('fails with the custom message when dockerfile_path is an empty string', () => {
    const { error } = existingDockerfileSchema.validate({ ...validPayload, dockerfile_path: '' });
    expect(error.details[0].message).toBe('Please provide the path to your Dockerfile in the repo');
  });

  it('trims surrounding whitespace from dockerfile_path', () => {
    const { error, value } = existingDockerfileSchema.validate({
      ...validPayload,
      dockerfile_path: '  Dockerfile  ',
    });
    expect(error).toBeUndefined();
    expect(value.dockerfile_path).toBe('Dockerfile');
  });
});

describe('generateDockerfileSchema', () => {
  const validPayload = {
    service_id: VALID_UUID,
    github_token_id: VALID_UUID,
    language: 'node',
    base_image: 'node:22-alpine',
    port: 3000,
    run_command: 'node index.js',
  };

  it('passes with a fully valid payload and defaults target_path to "Dockerfile"', () => {
    const { error, value } = generateDockerfileSchema.validate(validPayload);
    expect(error).toBeUndefined();
    expect(value.target_path).toBe('Dockerfile');
  });

  it('trims a provided target_path', () => {
    const { error, value } = generateDockerfileSchema.validate({
      ...validPayload,
      target_path: '  apps/api/Dockerfile  ',
    });
    expect(error).toBeUndefined();
    expect(value.target_path).toBe('apps/api/Dockerfile');
  });

  it('fails with the default any.required type when service_id is missing (no custom message defined)', () => {
    const { service_id, ...rest } = validPayload;
    const { error } = generateDockerfileSchema.validate(rest);
    expect(error.details[0].type).toBe('any.required');
  });

  it('fails with the custom message when github_token_id is missing', () => {
    const { github_token_id, ...rest } = validPayload;
    const { error } = generateDockerfileSchema.validate(rest);
    expect(error.details[0].message).toBe('Please select which GitHub token to use');
  });

  it('fails with the default message when language is not one of SUPPORTED_LANGUAGES', () => {
    const { error } = generateDockerfileSchema.validate({ ...validPayload, language: 'ruby' });
    expect(error.details[0].type).toBe('any.only');
  });

  it('fails with the default any.required type when base_image is missing entirely', () => {
    const { base_image, ...rest } = validPayload;
    const { error } = generateDockerfileSchema.validate(rest);
    expect(error.details[0].type).toBe('any.required');
  });

  it('fails with the custom message when base_image is an empty string', () => {
    const { error } = generateDockerfileSchema.validate({ ...validPayload, base_image: '' });
    expect(error.details[0].message).toBe('Base image is required');
  });

  it('fails with the custom message when port is not a number', () => {
    const { error } = generateDockerfileSchema.validate({ ...validPayload, port: 'not-a-port' });
    expect(error.details[0].message).toBe('Port must be a valid number');
  });

  it('fails with the default message when port is out of range', () => {
    const tooLow = generateDockerfileSchema.validate({ ...validPayload, port: 0 });
    const tooHigh = generateDockerfileSchema.validate({ ...validPayload, port: 70000 });
    expect(tooLow.error.details[0].type).toBe('number.min');
    expect(tooHigh.error.details[0].type).toBe('number.max');
  });

  it('fails with the default any.required type when run_command is missing entirely', () => {
    const { run_command, ...rest } = validPayload;
    const { error } = generateDockerfileSchema.validate(rest);
    expect(error.details[0].type).toBe('any.required');
  });

  it('fails with the custom message when run_command is an empty string', () => {
    const { error } = generateDockerfileSchema.validate({ ...validPayload, run_command: '' });
    expect(error.details[0].message).toBe('Run command is required');
  });
});