# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
