# Prism Web Distribution

`@kailash/prism-web` is distributed as a packed npm tarball attached to a
GitHub Release on `terrene-foundation/kailash-prism`. Consumers install
directly from the release asset URL pinned by a git tag. No npm registry
publication is involved.

This page is the contract between Prism maintainers (who cut releases) and
Prism consumers (who install them).

## How consumers install a release

Add the release asset URL to `dependencies` in the consuming project's
`package.json`:

```json
{
  "dependencies": {
    "@kailash/prism-web": "https://github.com/terrene-foundation/kailash-prism/releases/download/web-v0.3.1/kailash-prism-web-0.3.1.tgz"
  }
}
```

Then run `npm install`. `npm` / `pnpm` / `yarn` all accept tarball URLs
directly — no registry configuration, `.npmrc`, or personal access token
is required, because releases are public.

The tarball file name follows the `npm pack` convention:
`<scope><name>-<version>.tgz` with the scope slash replaced by a dash, so
`@kailash/prism-web@0.3.1` becomes `kailash-prism-web-0.3.1.tgz`.

### Upgrading

Bump the version in the URL and re-run `npm install`. Tags are immutable,
so a given URL always resolves to the same tarball bytes — reproducible
installs without a lockfile registry.

### Local tarballs still work

The previous `/tmp/*.tgz` workflow is unchanged. Point a consumer at a
local path:

```json
{
  "dependencies": {
    "@kailash/prism-web": "file:/tmp/kailash-prism-web-0.3.1.tgz"
  }
}
```

This is the recommended pattern for pre-release testing against a tarball
that has not yet been tagged. GitHub Release distribution is additive —
it does not replace the local-tarball workflow.

## How maintainers cut a release

1. Bump `web/package.json` `version` on a feature branch.
2. Update `web/CHANGELOG.md` with a new section headed `## X.Y.Z — YYYY-MM-DD — <summary>`.
3. Merge the version bump to `main`.
4. From `main`, tag the release and push the tag:

   ```bash
   git checkout main && git pull
   git tag web-vX.Y.Z
   git push origin web-vX.Y.Z
   ```

5. The `release-web.yml` workflow runs automatically on the tag push:
   - Installs deps (`npm ci`) and builds (`npm run build`) inside `web/`.
   - Verifies the tag version matches `web/package.json`.
   - Runs `npm pack` to produce the tarball.
   - Extracts the matching CHANGELOG section as the release body.
   - Creates a GitHub Release named `web-vX.Y.Z` and attaches the `.tgz`.

6. Verify the release appears at
   `https://github.com/terrene-foundation/kailash-prism/releases/tag/web-vX.Y.Z`
   and that the tarball asset is attached.

### Local dry-run before tagging

Contributors can verify the tarball contents locally before pushing a tag:

```bash
cd web
npm run release:check
```

`release:check` runs the same build as CI and then `npm pack --dry-run`,
which prints the file list that would be included in the tarball without
producing any side effects.

## Troubleshooting

### The workflow failed — how do I retry?

Because GitHub Releases and git tags are one-to-one, a failed release must
be fully retracted before a retry. Delete the tag locally and on the
remote, then re-push:

```bash
git tag -d web-vX.Y.Z
git push --delete origin web-vX.Y.Z
# fix the underlying issue, commit on main via a normal PR
git tag web-vX.Y.Z
git push origin web-vX.Y.Z
```

**Do not force-push to `main`** to "fix" a release. `main` is protected
and branch history is immutable — always land the fix as a new commit via
a normal PR before re-tagging.

If the tag was pushed but the workflow did not trigger (rare; usually a
GitHub outage), re-tagging to the same SHA is sufficient once the tag has
been deleted on origin.

### The tag version does not match `package.json`

The workflow fails fast with
`Tag web-vX.Y.Z (version X.Y.Z) does not match web/package.json version ...`.
This means the tag was pushed without first merging the version bump.
Delete the tag as above, merge the bump PR to `main`, then re-tag.

### The CHANGELOG section was not found

The workflow falls back to a generic "See CHANGELOG.md" body. Either add
the missing section in a follow-up PR and re-tag, or edit the release
body manually in the GitHub UI. The tarball asset itself is unaffected.

### A consumer reports `ETARGET` / `404` on the tarball URL

Check the release page. Most commonly the tag was pushed but the workflow
has not finished attaching the asset yet (first run takes ~2 minutes).
Once `fail_on_unmatched_files: true` has reported success, the URL is
permanent.

## Why this shape

Distribution decisions for `@kailash/prism-web`:

- **No npm registry publication.** The Foundation distributes through its
  own GitHub org. No external registry account, no publish token, no npm
  org ownership to maintain.
- **GitHub Releases (not GitHub Packages).** Release assets are public and
  consumable via a plain HTTPS URL. GitHub Packages would require every
  consumer to authenticate with a personal access token, which is a
  prohibitive install-time friction for an open-source library.
- **Tag-pinned URLs.** A URL like
  `.../releases/download/web-vX.Y.Z/kailash-prism-web-X.Y.Z.tgz` is
  reproducible forever — git tags on a protected branch are immutable, and
  GitHub preserves release assets indefinitely.
- **Monorepo-friendly tag prefix.** `web-v*` scopes the trigger to the
  web workspace. Future Flutter / Tauri / compiler releases can use
  `flutter-v*`, `tauri-v*`, `compiler-v*` prefixes without collision.
