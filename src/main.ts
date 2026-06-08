import * as core from '@actions/core';
import * as github from '@actions/github';

/**
 * Parse the major version segment from a full semver release tag.
 *
 * Accepts tags with or without a leading `v` (e.g. `v1.2.3` or `1.2.3`).
 * Returns the major tag with a leading `v` (e.g. `v1`).
 *
 * Throws a descriptive error when the input is not a valid semver string.
 */
export function parseMajor(tag: string): string {
  // Strip optional leading 'v' before matching.
  const bare = tag.startsWith('v') ? tag.slice(1) : tag;
  const match = /^(\d+)\.\d+\.\d+/.exec(bare);
  if (!match) {
    throw new Error(`"${tag}" is not a valid semver tag (expected vMAJOR.MINOR.PATCH).`);
  }
  return `v${match[1]}`;
}

/**
 * Main action runner.
 *
 * Reads inputs `tag` and `github-token`, resolves the SHA that `tag` points
 * to, then force-creates or force-updates the floating major tag (e.g. `v1`)
 * to that same SHA via the GitHub refs API.
 */
export async function run(): Promise<void> {
  try {
    const tag = core.getInput('tag', { required: true });
    const token = core.getInput('github-token', { required: true });

    // Validate and parse the major segment — throws on bad input.
    const majorTag = parseMajor(tag);

    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    core.info(`Moving major tag ${majorTag} to match release tag ${tag} (${owner}/${repo})`);

    // 1. Resolve the SHA that the precise release tag points to.
    // getRef ref path uses "tags/<name>" (no "refs/" prefix; keeps the tag name as-is).
    const preciseRef = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `tags/${tag}`,
    });
    const sha = preciseRef.data.object.sha;

    core.info(`Resolved SHA for ${tag}: ${sha}`);

    // 2. Check whether the major tag ref already exists.
    const majorRefPath = `tags/${majorTag}`;
    let majorExists = false;
    try {
      await octokit.rest.git.getRef({ owner, repo, ref: majorRefPath });
      majorExists = true;
    } catch (err: unknown) {
      // A 404 means the major tag does not exist yet — that's expected on first release.
      if (isHttpError(err) && err.status === 404) {
        majorExists = false;
      } else {
        throw err;
      }
    }

    // 3. Create or force-update the major tag ref.
    if (majorExists) {
      core.info(`Updating existing ref ${majorRefPath} → ${sha}`);
      await octokit.rest.git.updateRef({
        owner,
        repo,
        ref: majorRefPath,
        sha,
        force: true,
      });
    } else {
      core.info(`Creating new ref refs/tags/${majorTag} → ${sha}`);
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/tags/${majorTag}`,
        sha,
      });
    }

    core.setOutput('major-tag', majorTag);
    core.info(`Successfully moved ${majorTag} → ${sha}`);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed(String(error));
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface HttpError {
  status: number;
  message: string;
}

function isHttpError(err: unknown): err is HttpError {
  return typeof err === 'object' && err !== null && 'status' in err;
}
