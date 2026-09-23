# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
