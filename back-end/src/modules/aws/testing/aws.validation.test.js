const { createCredentialSchema, updateCredentialSchema } = require('../aws.validation');

describe('createCredentialSchema', () => {
  const validPayload = {
    name: 'Prod',
    access_key: 'AKIAABCDEFGHIJKLMNOP',
    secret_key: 'a-sufficiently-long-secret',
  };

  it('passes with a valid name, access_key, and secret_key', () => {
    const { error, value } = createCredentialSchema.validate(validPayload);
    expect(error).toBeUndefined();
    expect(value).toEqual(validPayload);
  });

  it('passes when name is omitted (optional)', () => {
    const { name, ...rest } = validPayload;
    const { error } = createCredentialSchema.validate(rest);
    expect(error).toBeUndefined();
  });

  it('passes when name is null', () => {
    const { error } = createCredentialSchema.validate({ ...validPayload, name: null });
    expect(error).toBeUndefined();
  });

  it('passes when name is an empty string', () => {
    const { error } = createCredentialSchema.validate({ ...validPayload, name: '' });
    expect(error).toBeUndefined();
  });

  it('fails when name exceeds 100 characters', () => {
    const { error } = createCredentialSchema.validate({ ...validPayload, name: 'a'.repeat(101) });
    expect(error.details[0].type).toBe('string.max');
  });

  it('fails when access_key is missing', () => {
    const { access_key, ...rest } = validPayload;
    const { error } = createCredentialSchema.validate(rest);
    expect(error.details[0].type).toBe('any.required');
  });

  it('fails when access_key is shorter than 16 characters', () => {
    const { error } = createCredentialSchema.validate({ ...validPayload, access_key: 'shortkey' });
    expect(error.details[0].type).toBe('string.min');
  });

  it('fails when access_key exceeds 128 characters', () => {
    const { error } = createCredentialSchema.validate({ ...validPayload, access_key: 'a'.repeat(129) });
    expect(error.details[0].type).toBe('string.max');
  });

  it('fails when secret_key is missing', () => {
    const { secret_key, ...rest } = validPayload;
    const { error } = createCredentialSchema.validate(rest);
    expect(error.details[0].type).toBe('any.required');
  });

  it('fails when secret_key is shorter than 16 characters', () => {
    const { error } = createCredentialSchema.validate({ ...validPayload, secret_key: 'shortsecret' });
    expect(error.details[0].type).toBe('string.min');
  });

  it('fails when secret_key exceeds 256 characters', () => {
    const { error } = createCredentialSchema.validate({ ...validPayload, secret_key: 'a'.repeat(257) });
    expect(error.details[0].type).toBe('string.max');
  });

  it('trims surrounding whitespace from access_key and secret_key', () => {
    const { error, value } = createCredentialSchema.validate({
      ...validPayload,
      access_key: '  AKIAABCDEFGHIJKLMNOP  ',
      secret_key: '  a-sufficiently-long-secret  ',
    });
    expect(error).toBeUndefined();
    expect(value.access_key).toBe('AKIAABCDEFGHIJKLMNOP');
    expect(value.secret_key).toBe('a-sufficiently-long-secret');
  });
});

describe('updateCredentialSchema', () => {
  it('passes when only name is provided', () => {
    const { error } = updateCredentialSchema.validate({ name: 'Renamed' });
    expect(error).toBeUndefined();
  });

  it('passes when only access_key is provided', () => {
    const { error } = updateCredentialSchema.validate({ access_key: 'AKIAABCDEFGHIJKLMNOP' });
    expect(error).toBeUndefined();
  });

  it('passes when only secret_key is provided', () => {
    const { error } = updateCredentialSchema.validate({ secret_key: 'a-sufficiently-long-secret' });
    expect(error).toBeUndefined();
  });

  it('passes when name is explicitly null (still counts as a provided field)', () => {
    const { error } = updateCredentialSchema.validate({ name: null });
    expect(error).toBeUndefined();
  });

  it('fails when the body is empty (.min(1) requires at least one field)', () => {
    const { error } = updateCredentialSchema.validate({});
    expect(error.details[0].type).toBe('object.min');
  });

  it('fails when access_key is shorter than 16 characters', () => {
    const { error } = updateCredentialSchema.validate({ access_key: 'shortkey' });
    expect(error.details[0].type).toBe('string.min');
  });

  it('fails when secret_key exceeds 256 characters', () => {
    const { error } = updateCredentialSchema.validate({ secret_key: 'a'.repeat(257) });
    expect(error.details[0].type).toBe('string.max');
  });

  it('fails when name exceeds 100 characters', () => {
    const { error } = updateCredentialSchema.validate({ name: 'a'.repeat(101) });
    expect(error.details[0].type).toBe('string.max');
  });
});