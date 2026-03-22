import { debug, warn, error } from '../../scripts/utils/logger';

const LOG_PREFIX = '[PFS Chronicle]';

let mockDebugMode = false;

beforeEach(() => {
  mockDebugMode = false;

  globalThis.game = {
    settings: {
      get: jest.fn((_moduleId: string, key: string) => {
        if (key === 'debugMode') return mockDebugMode;
        return undefined;
      }),
    },
  } as any; // FoundryVTT global mock

  jest.spyOn(console, 'log').mockImplementation();
  jest.spyOn(console, 'warn').mockImplementation();
  jest.spyOn(console, 'error').mockImplementation();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Logger module exports', () => {
  it('exports debug as a function', () => {
    expect(typeof debug).toBe('function');
  });

  it('exports warn as a function', () => {
    expect(typeof warn).toBe('function');
  });

  it('exports error as a function', () => {
    expect(typeof error).toBe('function');
  });
});

describe('debug()', () => {
  it('suppresses output when debugMode is false', () => {
    mockDebugMode = false;

    debug('test message');

    expect(console.log).not.toHaveBeenCalled();
  });

  it('emits output when debugMode is true', () => {
    mockDebugMode = true;

    debug('test message');

    expect(console.log).toHaveBeenCalledWith(LOG_PREFIX, 'test message');
  });

  it('emits prefix with empty message string when debugMode is true', () => {
    mockDebugMode = true;

    debug('');

    expect(console.log).toHaveBeenCalledWith(LOG_PREFIX, '');
  });

  it('falls back to emitting via console.log when game.settings.get throws', () => {
    globalThis.game = {
      settings: {
        get: jest.fn(() => {
          throw new Error('Settings not registered');
        }),
      },
    } as any; // FoundryVTT global mock

    debug('fallback message');

    expect(console.log).toHaveBeenCalledWith(LOG_PREFIX, 'fallback message');
  });
});

describe('warn()', () => {
  it('emits via console.warn when debugMode is false', () => {
    mockDebugMode = false;

    warn('warning message');

    expect(console.warn).toHaveBeenCalledWith(LOG_PREFIX, 'warning message');
  });

  it('emits via console.warn when debugMode is true', () => {
    mockDebugMode = true;

    warn('warning message');

    expect(console.warn).toHaveBeenCalledWith(LOG_PREFIX, 'warning message');
  });
});

describe('error()', () => {
  it('emits via console.error when debugMode is false', () => {
    mockDebugMode = false;

    error('error message');

    expect(console.error).toHaveBeenCalledWith(LOG_PREFIX, 'error message');
  });

  it('emits via console.error when debugMode is true', () => {
    mockDebugMode = true;

    error('error message');

    expect(console.error).toHaveBeenCalledWith(LOG_PREFIX, 'error message');
  });
});

describe('Log prefix', () => {
  it('debug prepends [PFS Chronicle] prefix', () => {
    mockDebugMode = true;

    debug('some message');

    expect(console.log).toHaveBeenCalledWith(
      LOG_PREFIX,
      'some message'
    );
  });

  it('warn prepends [PFS Chronicle] prefix', () => {
    warn('some message');

    expect(console.warn).toHaveBeenCalledWith(
      LOG_PREFIX,
      'some message'
    );
  });

  it('error prepends [PFS Chronicle] prefix', () => {
    error('some message');

    expect(console.error).toHaveBeenCalledWith(
      LOG_PREFIX,
      'some message'
    );
  });
});
