# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.0] - 2026-10-18

### Added

- Add PFS 8-07 and 8-08 and SFS 2-07
- Add support for SFS 1-12
- event-driven overlay dismissal in integration helpers
- playwright integration setup with pf2e and starfinder seeding

### Fixed

- Remove stale duplicate pfs2 layouts
- Drop stray comma from a PFS 5-11 checkbox label
- Keep 2.5 treasure bundles for Series 1 Quests
- Refresh character XP labels when shared XP changes
- Offer the 2 treasure bundle Bounty default
- Halve slow track earned income only once

### Changed

- bump handlebars from 4.7.9 to 4.7.10
- bump js-yaml
- bump the dev-minor-patch group with 11 updates
- bump the dev-minor-patch group across 1 directory with 10 updates
- Drop the draft-release workflow
- Update foundry-test-kit to 0.2.1
- Drop the repo copy of the release script
- Let the Integration workflow run by hand to fill caches
- Cache Foundry builds by version, keep license out of caches
- Update foundry-test-kit to 0.2.0
- bump brace-expansion from 1.1.18 to 1.1.21
- Keep Prettier away from generated layouts
- Escape ampersands in the layout name property test
- Update foundry-test-kit to 0.1.1
- Run integration tests on releases for Foundry 13 and 14
- Keep Foundry test files in .foundry-test
- Describe integration tests on foundry-test-kit
- Run integration tests in GitHub Actions
- Run integration tests on foundry-test-kit
- Document running the integration tests
- Cover Starfinder Society chronicle workflows
- Cover Pathfinder chronicle workflows end to end
- Add integration test support layer
- Run integration tests per game system world
- Add e2e coverage report for integration tests
- Add husky hooks with lint-staged, Prettier and mermaid checks
- Move override state notes out of composite states
- Replace legacy-peer-deps with a scoped TypeScript override

[1.10.0]: https://github.com/scooper4711/pfs-chronicle-generator/releases/tag/v1.10.0

## [1.9.0] - 2026-09-29

### Added

- filename hover text on character sheet chronicle buttons
- fill-in blank fields end to end

### Fixed

- verb in hover text for chronicle buttons

### Changed

- bump nanoid from 3.3.16 to 3.3.19
- bump js-yaml from 3.15.0 to 3.15.2
- bump browserslist from 4.28.4 to 4.28.9
- bump @humanfs/node from 0.16.7 to 0.16.8
- bump sanitize-html from 2.17.0 to 2.17.7
- bump js-yaml from 5.2.1 to 5.2.2
- bump socket.io-parser from 4.2.4 to 4.2.7
- bump postcss from 8.5.13 to 8.5.25
- bump immutable from 5.1.5 to 5.1.9
- bump actions/setup-node from 6 to 7
- bump ws, engine.io, socket.io-adapter and engine.io-client

[1.9.0]: https://github.com/scooper4711/pfs-chronicle-generator/releases/tag/v1.9.0

## [1.8.0] - 2026-09-23

### Added

- scenarios 8-05, 8-06, SFS 2-05, 2-06 and season updates

### Fixed

- Add ts-expect-error for @types/jest recursive type issue TypeScript 6.0 hits recursion limits when @types/jest expands HTMLElement into its matcher union type in toHaveBeenCalledWith. Runtime assertions remain intact; suppression is compile-time only.

### Changed

- bump the dev-dependencies group across 1 directory with 9 updates
- bump brace-expansion
- bump the dev-dependencies group across 1 directory with 6 updates
- bump jest and @types/jest
- locks node to version 24.17.0
- bump concurrently from 9.2.3 to 10.0.3
- bump jscpd from 4.2.3 to 5.0.11
- bump js-yaml from 4.2.0 to 5.2.1
- bump the dev-dependencies group with 5 updates
- configure dependabot behavior to group patches in fewer PRs

[1.8.0]: https://github.com/scooper4711/pfs-chronicle-generator/releases/tag/v1.8.0
