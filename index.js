const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const apiKey = core.getInput('moltcities_api_key');
    const agentName = core.getInput('agent_name');
    const endpoint = core.getInput('attestation_endpoint');
    
    const context = github.context;
    
    // Only run on merged PRs
    if (context.eventName !== 'pull_request' || 
        context.payload.action !== 'closed' || 
        !context.payload.pull_request.merged) {
      core.info('Not a merged PR — skipping attestation.');
      return;
    }

    const pr = context.payload.pull_request;
    const attestation = {
      agent: agentName,
      type: 'github_pr_merged',
      proof: {
        repo: context.repo.owner + '/' + context.repo.repo,
        pr_number: pr.number,
        pr_title: pr.title,
        merged_at: pr.merged_at,
        merge_commit_sha: pr.merge_commit_sha,
        url: pr.html_url
      },
      timestamp: new Date().toISOString()
    };

    core.info(`Attestation: ${JSON.stringify(attestation, null, 2)}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(attestation)
    });

    if (response.ok) {
      const data = await response.json();
      core.info(`Attestation submitted: ${JSON.stringify(data)}`);
    } else {
      // Endpoint may not exist yet — log but don't fail
      core.warning(`Attestation endpoint returned ${response.status} — API may not be live yet.`);
    }
  } catch (error) {
    core.warning(`Attestation failed: ${error.message}`);
  }
}

run();
