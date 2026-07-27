const { createServiceSchema, updateServiceSchema } = require('../service.validation');

describe('createServiceSchema', () => {
  it('passes with a valid name, repository_url and branch', () => {
    const { error, value } = createServiceSchema.validate({
      name: 'api',
      repository_url: 'https://github.com/user/api',
      branch: 'main',
    });

    expect(error).toBeUndefined();
    expect(value).toEqual({
      name: 'api',
      repository_url: 'https://github.com/user/api',
      branch: 'main',
    });
  });

  it('passes without branch (branch is optional)', () => {
    const { error } = createServiceSchema.validate({
      name: 'api',
      repository_url: 'https://github.com/user/api',
    });
    expect(error).toBeUndefined();
  });

  it('fails when name is missing', () => {
    const { error } = createServiceSchema.validate({
      repository_url: 'https://github.com/user/api',
    });
    expect(error).toBeDefined();
    expect(error.details[0].type).toBe('any.required');
    expect(error.details[0].path).toEqual(['name']);
  });

  it('fails when name is an empty string, using the custom message', () => {
    const { error } = createServiceSchema.validate({
      name: '',
      repository_url: 'https://github.com/user/api',
    });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('Service name is required');
  });

  it('fails when name is shorter than 2 characters', () => {
    const { error } = createServiceSchema.validate({
      name: 'a',
      repository_url: 'https://github.com/user/api',
    });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('Service name must be at least 2 characters long');
  });

  it('fails when name exceeds 100 characters', () => {
    const { error } = createServiceSchema.validate({
      name: 'a'.repeat(101),
      repository_url: 'https://github.com/user/api',
    });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('Service name must not exceed 100 characters');
  });

  it('fails when repository_url is missing', () => {
    const { error } = createServiceSchema.validate({ name: 'api' });
    expect(error).toBeDefined();
    expect(error.details[0].type).toBe('any.required');
    expect(error.details[0].path).toEqual(['repository_url']);
  });

  it('fails when repository_url is not a valid URI', () => {
    const { error } = createServiceSchema.validate({
      name: 'api',
      repository_url: 'not-a-valid-url',
    });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('repository_url must be a valid URL');
  });

  it('fails when branch exceeds 100 characters', () => {
    const { error } = createServiceSchema.validate({
      name: 'api',
      repository_url: 'https://github.com/user/api',
      branch: 'a'.repeat(101),
    });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('Branch name must not exceed 100 characters');
  });
});

describe('updateServiceSchema', () => {
  it('passes when only name is provided', () => {
    const { error } = updateServiceSchema.validate({ name: 'new-name' });
    expect(error).toBeUndefined();
  });

  it('passes when only repository_url is provided', () => {
    const { error } = updateServiceSchema.validate({
      repository_url: 'https://github.com/user/new',
    });
    expect(error).toBeUndefined();
  });

  it('passes when only branch is provided', () => {
    const { error } = updateServiceSchema.validate({ branch: 'develop' });
    expect(error).toBeUndefined();
  });

  it('fails when the body is empty (at least one field is required)', () => {
    const { error } = updateServiceSchema.validate({});
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('At least one field must be provided for update');
  });

  it('fails when name is shorter than 2 characters', () => {
    const { error } = updateServiceSchema.validate({ name: 'a' });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('Service name must be at least 2 characters long');
  });

  it('fails when repository_url is not a valid URI', () => {
    const { error } = updateServiceSchema.validate({ repository_url: 'not-a-valid-url' });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('repository_url must be a valid URL');
  });

  it('fails when branch exceeds 100 characters', () => {
    const { error } = updateServiceSchema.validate({ branch: 'a'.repeat(101) });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('Branch name must not exceed 100 characters');
  });
});
