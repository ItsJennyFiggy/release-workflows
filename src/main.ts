import * as core from '@actions/core';

/**
 * The main runner function for the GitHub Action.
 */
export async function run(): Promise<void> {
  try {
    const whoToGreet = core.getInput('who-to-greet', { required: true });
    core.info(`Greeting ${whoToGreet}...`);

    const greeting = `Hello, ${whoToGreet}!`;
    core.setOutput('greeting', greeting);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed(String(error));
    }
    throw error;
  }
}
