import { createOtpCooldown } from '../src/modules/otp-policy';
import { renderOtpEmail } from '../src/infrastructure/otp-email';

describe('authentication policy helpers', () => {
  it('enforces a normalized per-recipient cooldown with independent addresses', () => {
    const acquire = createOtpCooldown(30);
    expect(acquire('Person@Example.test', 100)).toBe(true);
    expect(acquire(' person@example.test ', 129)).toBe(false);
    expect(acquire('other@example.test', 129)).toBe(true);
    expect(acquire('person@example.test', 130)).toBe(true);
  });

  it('limits recipient state and admits new addresses when a slot expires', () => {
    const acquire = createOtpCooldown(30, 2);
    expect(acquire('a@example.test', 100)).toBe(true);
    expect(acquire('b@example.test', 110)).toBe(true);
    expect(acquire('c@example.test', 129)).toBe(false);
    expect(acquire('c@example.test', 130)).toBe(true);
  });

  it('builds branded HTML and plain text without placing a code in the subject', () => {
    const otp = '004321';
    const signin = renderOtpEmail(otp, 'sign-in');
    const verification = renderOtpEmail(otp, 'email-verification');
    expect(signin.subject).toContain('Finora');
    expect(signin.subject).not.toContain(otp);
    expect(signin.text).toContain(otp);
    expect(signin.html).toContain(otp);
    expect(signin.html).toContain('lang="vi"');
    expect(signin.html).toContain('5 phút');
    expect(verification.subject).not.toBe(signin.subject);
    expect(() => renderOtpEmail('<code>', 'sign-in')).toThrow();
  });
});
