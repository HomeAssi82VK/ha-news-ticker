# Changelog

## [1.0.6] - 2026-10-24

- First regular (non-prerelease) version of News Ticker.
- Keeps the RSS/Atom parser, animations, visual editor, and Grid layout behavior of the tested previous version.
- Updated version identifiers and installation documentation; no functional changes.

## [1.0.6-beta.7] - 2026-10-24

- Uses standard Home Assistant custom-card catalog registration, without a picker monkey patch.
- Based on the working `v1.0.5` Grid layout fix, clock and seamless ticker animation.
- Bundles the RSS/Atom parser recovery introduced in `v1.0.3`.
- Improves visual editor support and error diagnostics.
- Adds the initial GitHub/HACS publication scaffolding (documentation and CI only; runtime behavior unchanged).

**Note:** The later experimental `v1.0.7-beta.8` picker workaround is intentionally **not** included in this repository.

The earlier beta was tested in one Home Assistant installation. Automated HACS and Hassfest checks now pass; broader real-world testing is welcome.
