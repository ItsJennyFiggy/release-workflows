import * as core from '@actions/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseMajor, run } from '../src/main';

// Block all network access — unit tests must be fully in-memory.
vi.mock('@actions/core');

// Hoist mock fns so they are available inside the vi.mock factory (which is hoisted to top).
const { mockGetRef, mockCreateRef, mockUpdateRef, mockGetOctokit } = vi.hoisted(() => ({
  mockGetRef: vi.fn(),
  mockCreateRef: vi.fn(),
  mockUpdateRef: vi.fn(),
  mockGetOctokit: vi.fn(),
}));

// Mock @actions/github with a factory so `context` is a plain, writable object.
vi.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'ItsJennyFiggy', repo: 'release-workflows' },
  },
  getOctokit: mockGetOctokit,
}));

function buildOctokit() {
  return {
    rest: {
      git: {
        getRef: mockGetRef,
        createRef: mockCreateRef,
        updateRef: mockUpdateRef,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// parseMajor — pure helper
// ---------------------------------------------------------------------------
describe('parseMajor', () => {
  it('parses major from a standard semver tag with leading v', () => {
    // Arrange / Act / Assert
    expect(parseMajor('v1.2.3')).toBe('v1');
  });

  it('parses major from v2.0.0', () => {
    expect(parseMajor('v2.0.0')).toBe('v2');
  });

  it('parses major from v10.99.100', () => {
    expect(parseMajor('v10.99.100')).toBe('v10');
  });

  it('parses major from semver without leading v', () => {
    expect(parseMajor('3.4.5')).toBe('v3');
  });

  it('throws on non-semver input: missing patch', () => {
    // Arrange / Act / Assert
    expect(() => parseMajor('v1.2')).toThrow(/not a valid semver/i);
  });

  it('throws on non-semver input: plain word', () => {
    expect(() => parseMajor('latest')).toThrow(/not a valid semver/i);
  });

  it('throws on empty string', () => {
    expect(() => parseMajor('')).toThrow(/not a valid semver/i);
  });

  it('throws on tag with non-numeric major', () => {
    expect(() => parseMajor('vX.1.0')).toThrow(/not a valid semver/i);
  });
});

// ---------------------------------------------------------------------------
// run() — action entrypoint with mocked octokit
// ---------------------------------------------------------------------------

describe('run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOctokit.mockReturnValue(buildOctokit());
  });

  it('creates a new major tag when the ref does not yet exist', async () => {
    // Arrange
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === 'tag') return 'v1.2.3';
      if (name === 'github-token') return 'ghs_fake_token';
      return '';
    });
    // getRef: precise tag returns a sha; major tag ref throws 404
    mockGetRef.mockImplementation(async ({ ref }: { ref: string }) => {
      if (ref === 'tags/v1.2.3') return { data: { object: { sha: 'sha_v123' } } };
      throw Object.assign(new Error('Not Found'), { status: 404 });
    });
    mockCreateRef.mockResolvedValue({});

    // Act
    await run();

    // Assert
    expect(core.getInput).toHaveBeenCalledWith('tag', { required: true });
    expect(core.getInput).toHaveBeenCalledWith('github-token', { required: true });
    expect(mockGetRef).toHaveBeenCalledWith(expect.objectContaining({ ref: 'tags/v1' }));
    expect(mockCreateRef).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: 'refs/tags/v1',
        sha: 'sha_v123',
      }),
    );
    expect(mockUpdateRef).not.toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalledWith('major-tag', 'v1');
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('v1.2.3'));
  });

  it('force-updates an existing major tag when the ref already exists', async () => {
    // Arrange
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === 'tag') return 'v2.0.0';
      if (name === 'github-token') return 'ghs_fake_token';
      return '';
    });
    mockGetRef.mockImplementation(async ({ ref }: { ref: string }) => {
      if (ref === 'tags/v2.0.0') return { data: { object: { sha: 'sha_v200' } } };
      if (ref === 'tags/v2') return { data: { object: { sha: 'old_sha' } } };
      throw Object.assign(new Error('Not Found'), { status: 404 });
    });
    mockUpdateRef.mockResolvedValue({});

    // Act
    await run();

    // Assert
    expect(mockGetRef).toHaveBeenCalledWith(expect.objectContaining({ ref: 'tags/v2' }));
    expect(mockUpdateRef).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: 'tags/v2',
        sha: 'sha_v200',
        force: true,
      }),
    );
    expect(mockCreateRef).not.toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalledWith('major-tag', 'v2');
  });

  it('uses SHA from the precise release tag, not from the major tag', async () => {
    // Arrange
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === 'tag') return 'v3.1.0';
      if (name === 'github-token') return 'ghs_fake_token';
      return '';
    });
    mockGetRef.mockImplementation(async ({ ref }: { ref: string }) => {
      if (ref === 'tags/v3.1.0') return { data: { object: { sha: 'deadbeef' } } };
      throw Object.assign(new Error('Not Found'), { status: 404 });
    });
    mockCreateRef.mockResolvedValue({});

    // Act
    await run();

    // Assert — SHA used for major tag must come from the precise tag
    expect(mockCreateRef).toHaveBeenCalledWith(expect.objectContaining({ sha: 'deadbeef' }));
  });

  it('fails the action when tag is not valid semver', async () => {
    // Arrange
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === 'tag') return 'not-a-semver';
      if (name === 'github-token') return 'ghs_fake_token';
      return '';
    });

    // Act
    await run();

    // Assert
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringMatching(/not a valid semver/i));
    expect(mockGetRef).not.toHaveBeenCalled();
  });

  it('fails the action on unexpected octokit errors (non-404)', async () => {
    // Arrange
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === 'tag') return 'v1.2.3';
      if (name === 'github-token') return 'ghs_fake_token';
      return '';
    });
    mockGetRef.mockImplementation(async ({ ref }: { ref: string }) => {
      if (ref === 'tags/v1.2.3') return { data: { object: { sha: 'sha123' } } };
      throw Object.assign(new Error('API rate limit exceeded'), { status: 403 });
    });

    // Act
    await run();

    // Assert
    expect(core.setFailed).toHaveBeenCalledWith('API rate limit exceeded');
  });

  it('handles non-Error throws and stringifies them', async () => {
    // Arrange
    vi.mocked(core.getInput).mockImplementation((name: string) => {
      if (name === 'tag') return 'v1.2.3';
      if (name === 'github-token') return 'ghs_fake_token';
      return '';
    });
    mockGetRef.mockImplementation(async ({ ref }: { ref: string }) => {
      if (ref === 'tags/v1.2.3') return { data: { object: { sha: 'sha123' } } };
      throw 'raw string error';
    });

    // Act
    await run();

    // Assert
    expect(core.setFailed).toHaveBeenCalledWith('raw string error');
  });
});
