# deploy.yml

## Purpose
Build and publish the static archive to GitHub Pages on main-branch pushes or manual workflow dispatch.

## Contracts
Refresh complete public repository histories before testing and building. The collector uses the job's ephemeral `GH_TOKEN` through GitHub CLI; it never writes credentials to output. A failed refresh or validation prevents deployment, leaving the prior live version intact. No periodic schedule is configured.

Upload only `dist/`; publishing requires the existing Pages and identity permissions. The source snapshot is updated in the job workspace without creating automated commits.
