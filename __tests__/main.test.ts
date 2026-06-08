import * as core from '@actions/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../src/main';

vi.mock('@actions/core');

describe('run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should greet the target successfully', async () => {
    // Arrange
    const getInputMock = vi.mocked(core.getInput);
    getInputMock.mockReturnValue('Octocat');

    // Act
    await run();

    // Assert
    expect(core.getInput).toHaveBeenCalledWith('who-to-greet', { required: true });
    expect(core.info).toHaveBeenCalledWith('Greeting Octocat...');
    expect(core.setOutput).toHaveBeenCalledWith('greeting', 'Hello, Octocat!');
  });

  it('should handle errors and fail the action execution', async () => {
    // Arrange
    const getInputMock = vi.mocked(core.getInput);
    getInputMock.mockImplementation(() => {
      throw new Error('Input required: who-to-greet');
    });

    // Act & Assert
    await expect(run()).rejects.toThrow('Input required: who-to-greet');
    expect(core.setFailed).toHaveBeenCalledWith('Input required: who-to-greet');
  });

  it('should handle non-Error throws and stringify them', async () => {
    // Arrange
    const getInputMock = vi.mocked(core.getInput);
    getInputMock.mockImplementation(() => {
      // Intentionally throw a non-Error value to exercise the String() branch.
      throw 'unexpected string error';
    });

    // Act & Assert
    await expect(run()).rejects.toBe('unexpected string error');
    expect(core.setFailed).toHaveBeenCalledWith('unexpected string error');
  });
});
