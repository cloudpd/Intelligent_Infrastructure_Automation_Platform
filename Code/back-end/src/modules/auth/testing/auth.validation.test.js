const { signupSchema, loginSchema } = require('../auth.validation');

describe('signupSchema', () => {
  const validPayload = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'Passw0rd',
  };

  it('passes with a valid name, email, and password', () => {
    const { error, value } = signupSchema.validate(validPayload);

    expect(error).toBeUndefined();
    expect(value).toEqual({ ...validPayload, role: 'user' });
  });

  it('defaults role to "user" when omitted', () => {
    const { value } = signupSchema.validate(validPayload);
    expect(value.role).toBe('user');
  });

  it('accepts an explicit "admin" role', () => {
    const { error, value } = signupSchema.validate({ ...validPayload, role: 'admin' });
    expect(error).toBeUndefined();
    expect(value.role).toBe('admin');
  });

  it('fails with the custom message when role is not "user" or "admin"', () => {
    const { error } = signupSchema.validate({ ...validPayload, role: 'superadmin' });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('Role must be either "user" or "admin"');
  });

  // NOTE: none of these fields have a custom 'any.required' message defined
  // in the schema -- only 'string.empty' is overridden. So a fully missing
  // key surfaces Joi's default "any.required" message/type, while an empty
  // string surfaces the custom message. The two cases are tested separately
  // below to document that distinction.
  it('fails with the default any.required type when name is missing entirely', () => {
    const { name, ...rest } = validPayload;
    const { error } = signupSchema.validate(rest);
    expect(error).toBeDefined();
    expect(error.details[0].type).toBe('any.required');
  });

  it('fails with the custom message when name is an empty string', () => {
    const { error } = signupSchema.validate({ ...validPayload, name: '' });
    expect(error).toBeDefined();
    expect(error.details[0].message).toBe('Name is required');
  });

  it('fails when name is shorter than 3 characters', () => {
    const { error } = signupSchema.validate({ ...validPayload, name: 'Jo' });
    expect(error.details[0].message).toBe('Name must be at least 3 characters long');
  });

  it('fails when name is longer than 50 characters', () => {
    const { error } = signupSchema.validate({ ...validPayload, name: 'a'.repeat(51) });
    expect(error.details[0].message).toBe('Name must not exceed 50 characters');
  });

  it('fails with the default any.required type when email is missing entirely', () => {
    const { email, ...rest } = validPayload;
    const { error } = signupSchema.validate(rest);
    expect(error.details[0].type).toBe('any.required');
  });

  it('fails with the custom message when email is malformed', () => {
    const { error } = signupSchema.validate({ ...validPayload, email: 'not-an-email' });
    expect(error.details[0].message).toBe('Invalid email address');
  });

  it('fails with the default any.required type when password is missing entirely', () => {
    const { password, ...rest } = validPayload;
    const { error } = signupSchema.validate(rest);
    expect(error.details[0].type).toBe('any.required');
  });

  it('fails when password is shorter than 8 characters', () => {
    const { error } = signupSchema.validate({ ...validPayload, password: 'Ab1' });
    expect(error.details[0].message).toBe('Password must be at least 8 characters');
  });

  it('fails when password is longer than 16 characters', () => {
    const { error } = signupSchema.validate({ ...validPayload, password: 'Aa1'.repeat(6) });
    expect(error.details[0].message).toBe('Password must not exceed 16 characters');
  });

  it.each([
    ['an uppercase letter', 'password1'],
    ['a lowercase letter', 'PASSWORD1'],
    ['a number', 'PasswordOnly'],
  ])('fails with the pattern message when password is missing %s', (_label, password) => {
    const { error } = signupSchema.validate({ ...validPayload, password });
    expect(error.details[0].message).toBe(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    );
  });

  it('trims surrounding whitespace from a valid password', () => {
    const { error, value } = signupSchema.validate({ ...validPayload, password: '  Passw0rd  ' });
    expect(error).toBeUndefined();
    expect(value.password).toBe('Passw0rd');
  });
});

describe('loginSchema', () => {
  it('passes with a valid email and any non-empty password', () => {
    const { error } = loginSchema.validate({ email: 'john@example.com', password: 'anything' });
    expect(error).toBeUndefined();
  });

  it('fails with the custom message when email is malformed', () => {
    const { error } = loginSchema.validate({ email: 'not-an-email', password: 'anything' });
    expect(error.details[0].message).toBe('Invalid email address');
  });

  it('fails with the default any.required type when email is missing entirely', () => {
    const { error } = loginSchema.validate({ password: 'anything' });
    expect(error.details[0].type).toBe('any.required');
  });

  it('fails with the default any.required type when password is missing entirely', () => {
    const { error } = loginSchema.validate({ email: 'john@example.com' });
    expect(error.details[0].type).toBe('any.required');
  });

  // Unlike signupSchema, loginSchema places no strength rules (min/max/
  // pattern) on password -- it only checks that something was provided.
  // This is intentional: login shouldn't re-validate password strength,
  // only that the field is present.
  it('accepts a password that would fail signup strength rules', () => {
    const { error } = loginSchema.validate({ email: 'john@example.com', password: 'a' });
    expect(error).toBeUndefined();
  });
});
