const { createProjectSchema, updateProjectSchema } = require('../projects.validation');

describe('createProjectSchema', () => {
  it('passes with a valid name and description', () => {
    const { error, value } = createProjectSchema.validate({
      name: 'My Project',
      description: 'A short description',
    });

    expect(error).toBeUndefined();
    expect(value).toEqual({ name: 'My Project', description: 'A short description' });
  });

  it('passes with only a name (description is optional)', () => {
    const { error } = createProjectSchema.validate({ name: 'My Project' });
    expect(error).toBeUndefined();
  });

  it('fails when name is missing', () => {
    // NOTE: the schema's custom 'string.empty' message only fires for an
    // empty string (see the test below), not for a fully missing key -- a
    // missing key raises Joi's default 'any.required' message instead. This
    // test documents the current (default-message) behavior.
    const { error } = createProjectSchema.validate({ description: 'desc' });
    expect(error).toBeDefined();
    expect(error.details[0].type).toBe('any.required');
  });

  it('fails when name is an empty string, using the custom message', () => {
    const { error } = createProjectSchema.validate({ name: '' });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('Project name is required');
  });

  it('fails when name is shorter than 3 characters', () => {
    const { error } = createProjectSchema.validate({ name: 'ab' });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('Project name must be at least 3 characters long');
  });

  it('fails when name exceeds 100 characters', () => {
    const { error } = createProjectSchema.validate({ name: 'a'.repeat(101) });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('Project name must not exceed 100 characters');
  });

  it('fails when description exceeds 1000 characters', () => {
    const { error } = createProjectSchema.validate({
      name: 'Valid name',
      description: 'a'.repeat(1001),
    });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('Description must not exceed 1000 characters');
  });
});

describe('updateProjectSchema', () => {
  it('passes when only name is provided', () => {
    const { error } = updateProjectSchema.validate({ name: 'Renamed' });
    expect(error).toBeUndefined();
  });

  it('passes when only description is provided', () => {
    const { error } = updateProjectSchema.validate({ description: 'Updated desc' });
    expect(error).toBeUndefined();
  });

  it('fails when the body is empty (at least one field is required)', () => {
    const { error } = updateProjectSchema.validate({});
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('At least one field must be provided for update');
  });

  it('fails when name is shorter than 3 characters', () => {
    const { error } = updateProjectSchema.validate({ name: 'ab' });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('Project name must be at least 3 characters long');
  });

  it('fails when description exceeds 1000 characters', () => {
    const { error } = updateProjectSchema.validate({ description: 'a'.repeat(1001) });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('Description must not exceed 1000 characters');
  });
});