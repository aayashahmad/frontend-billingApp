import {
  createAccountValidationSchema,
  INITIAL_LOGIN_VALUES,
  INITIAL_SIGNUP_VALUES,
  loginValidationSchema,
  signupValidationSchema,
} from '../authValidationSchemas';

/**
 * Distinct failing field names. A single field can raise several errors at
 * once (an empty value fails both `required` and its format rule), so the
 * paths are deduped to keep assertions about *which fields* failed readable.
 */
const errorPaths = async (schema, values) => {
  try {
    await schema.validate(values, { abortEarly: false });
    return [];
  } catch (error) {
    return [...new Set(error.inner.map((issue) => issue.path))].sort();
  }
};

const validLogin = { login: 'owner@shop.com', password: 'secret123' };

const validSignup = {
  username: 'Asha Traders',
  email: 'owner@shop.com',
  phone: '9876543210',
  password: 'secret123',
  confirmPassword: 'secret123',
};

describe('loginValidationSchema', () => {
  it('accepts an email identifier', async () => {
    await expect(errorPaths(loginValidationSchema, validLogin)).resolves.toEqual([]);
  });

  it('accepts a phone identifier', async () => {
    await expect(
      errorPaths(loginValidationSchema, { ...validLogin, login: '9876543210' }),
    ).resolves.toEqual([]);
  });

  it('rejects the empty form', async () => {
    const paths = await errorPaths(loginValidationSchema, INITIAL_LOGIN_VALUES);
    expect(paths).toEqual(['login', 'password']);
  });

  it.each([
    ['a bare word', 'notanemail'],
    ['a malformed email', 'owner@shop'],
    ['too short a phone', '12345'],
  ])('rejects %s as an identifier', async (_label, login) => {
    const paths = await errorPaths(loginValidationSchema, { ...validLogin, login });
    expect(paths).toContain('login');
  });

  it('requires a password', async () => {
    const paths = await errorPaths(loginValidationSchema, {
      ...validLogin,
      password: '',
    });
    expect(paths).toContain('password');
  });
});

describe('signupValidationSchema', () => {
  it('accepts a fully valid signup', async () => {
    await expect(errorPaths(signupValidationSchema, validSignup)).resolves.toEqual([]);
  });

  it('rejects the empty form on every field', async () => {
    const paths = await errorPaths(signupValidationSchema, INITIAL_SIGNUP_VALUES);
    expect(paths).toEqual([
      'confirmPassword',
      'email',
      'password',
      'phone',
      'username',
    ]);
  });

  it('rejects a malformed email', async () => {
    const paths = await errorPaths(signupValidationSchema, {
      ...validSignup,
      email: 'owner@@shop.com',
    });
    expect(paths).toContain('email');
  });

  it('rejects a non-numeric phone', async () => {
    const paths = await errorPaths(signupValidationSchema, {
      ...validSignup,
      phone: '98765abcde',
    });
    expect(paths).toContain('phone');
  });

  it('rejects a password under 6 characters', async () => {
    const paths = await errorPaths(signupValidationSchema, {
      ...validSignup,
      password: 'abc',
      confirmPassword: 'abc',
    });
    expect(paths).toContain('password');
  });

  it('rejects mismatched password confirmation', async () => {
    const paths = await errorPaths(signupValidationSchema, {
      ...validSignup,
      confirmPassword: 'different',
    });
    expect(paths).toEqual(['confirmPassword']);
  });
});

describe('createAccountValidationSchema', () => {
  const base = {
    username: 'Shop Owner',
    email: 'owner@shop.com',
    phone: '9876543210',
    currentPassword: '',
  };

  it('accepts valid details without a password when contacts are unchanged', async () => {
    const schema = createAccountValidationSchema({ requiresPassword: false });
    await expect(schema.validate(base)).resolves.toBeTruthy();
  });

  it('demands the current password once email or phone changes', async () => {
    const schema = createAccountValidationSchema({ requiresPassword: true });
    await expect(schema.validate(base)).rejects.toThrow(
      /Confirm your password/,
    );
    await expect(
      schema.validate({ ...base, currentPassword: 'secret123' }),
    ).resolves.toBeTruthy();
  });

  it('rejects a blank name, bad email and non-numeric phone', async () => {
    const schema = createAccountValidationSchema();
    await expect(schema.validate({ ...base, username: '   ' })).rejects.toThrow(
      /Name is required/,
    );
    await expect(schema.validate({ ...base, email: 'nope' })).rejects.toThrow(
      /valid email/,
    );
    await expect(schema.validate({ ...base, phone: '98abc' })).rejects.toThrow(
      /digits only/,
    );
  });
});
