import { generateMessageId } from './id.utils';

describe('generateMessageId', () => {
  it('debe retornar un string con prefijo msg-', () => {
    const id = generateMessageId();
    expect(id).toMatch(/^msg-\d+-[a-z0-9]+$/);
  });

  it('debe generar ids únicos', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateMessageId()));
    expect(ids.size).toBe(100);
  });

  it('debe retornar un string', () => {
    expect(typeof generateMessageId()).toBe('string');
  });
});
