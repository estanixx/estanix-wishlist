import { describe, expect, it } from 'vitest';
import {
  MAX_OPTIONS_PER_WISH,
  ValidationError,
  assertOptionCountWithinLimit,
  assertValidOptionUrls,
  isValidUrl,
} from '../../lib/validation';

describe('assertOptionCountWithinLimit', () => {
  it('does not throw at exactly the cap', () => {
    expect(() => assertOptionCountWithinLimit(MAX_OPTIONS_PER_WISH)).not.toThrow();
  });

  it('does not throw below the cap', () => {
    expect(() => assertOptionCountWithinLimit(MAX_OPTIONS_PER_WISH - 1)).not.toThrow();
  });

  it('throws ValidationError above the cap', () => {
    expect(() => assertOptionCountWithinLimit(MAX_OPTIONS_PER_WISH + 1)).toThrow(ValidationError);
  });
});

describe('isValidUrl', () => {
  it('accepts an https URL', () => {
    expect(isValidUrl('https://example.com/image.png')).toBe(true);
  });

  it('rejects a bare string', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidUrl('')).toBe(false);
  });
});

describe('assertValidOptionUrls', () => {
  it('does not throw when both urls are valid', () => {
    expect(() => assertValidOptionUrls({ imageUrl: 'https://example.com/a.png', link: 'https://example.com/b' })).not.toThrow();
  });

  it('throws ValidationError when imageUrl is invalid', () => {
    expect(() => assertValidOptionUrls({ imageUrl: 'not-a-url', link: 'https://example.com' })).toThrow(ValidationError);
  });

  it('throws ValidationError when link is invalid', () => {
    expect(() => assertValidOptionUrls({ imageUrl: 'https://example.com', link: 'not-a-url' })).toThrow(ValidationError);
  });
});
