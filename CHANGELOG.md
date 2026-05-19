# Changelog

## [0.3.0](https://github.com/davidsneighbour/nanny/compare/v0.2.0...v0.3.0) (2026-05-19)

### Features

* **package:** add package init command ([cbfe11b](https://github.com/davidsneighbour/nanny/commit/cbfe11b34714ee12008e9a72798b27e29846e137))
* **package:** wire package init command ([97f5b34](https://github.com/davidsneighbour/nanny/commit/97f5b34231e36222aade9fc4fbed0a4298bd1358))

### Bug Fixes

* remove static jsonc files ([6d6a75b](https://github.com/davidsneighbour/nanny/commit/6d6a75bf5d23cf297aa2a2a4d7e58233296c5613))

### Build

* **deps:** update dependencies ([c7ca28f](https://github.com/davidsneighbour/nanny/commit/c7ca28ff1686f86bf2de2ed6037e9e5decba16f2))

### Chores

* **package:** add default package fragment ([5072029](https://github.com/davidsneighbour/nanny/commit/507202976955323b2ec8c91b2019d19f1949e344))
* **package:** add starter package fragment ([fc93d1f](https://github.com/davidsneighbour/nanny/commit/fc93d1fae07ae11041c701edfe2bcb77537b94e1))

### CI

* **fix:** cache poisening issue ([0f09bfc](https://github.com/davidsneighbour/nanny/commit/0f09bfccd3a9b1b94fd93e0cfb13696aa6b62560))
* **fix:** move to dnbhq renovate config ([74f091d](https://github.com/davidsneighbour/nanny/commit/74f091de3709af7ae2c329ce041e234bd258d86c))
* **fix:** simplify dependabot cooldown config ([1282273](https://github.com/davidsneighbour/nanny/commit/1282273bf13cc76faf3102a0ab53d0ac02f17ce0))

### Documentation

* **package:** document package init command ([da07776](https://github.com/davidsneighbour/nanny/commit/da07776dc7351e0d3c516ce29831ba1823d634c7))

### Tests

* **package:** add package init test script ([1953c77](https://github.com/davidsneighbour/nanny/commit/1953c779d81f49f800372d1086f44a11e88496f6))
* **package:** verify init roundtrip ([79055e4](https://github.com/davidsneighbour/nanny/commit/79055e4b282f3bd34a135a78210caa97e11d3fdb))

## [0.2.0](https://github.com/davidsneighbour/nanny/compare/v0.1.4...v0.2.0) (2026-05-19)

### Build

* **deps:** bump minimatch from 3.1.5 to 10.2.5 in the npm_and_yarn group across 1 directory ([#4](https://github.com/davidsneighbour/nanny/issues/4)) ([1df1cb4](https://github.com/davidsneighbour/nanny/commit/1df1cb43402b5889343bb43a8925321bdb23dd3a))
* **deps:** bump the npm_and_yarn group across 1 directory with 2 updates ([#5](https://github.com/davidsneighbour/nanny/issues/5)) ([d81f0d5](https://github.com/davidsneighbour/nanny/commit/d81f0d5dcd042295d69ffc271c58fc1f47a5450a))
* **deps:** update dependencies ([7a27367](https://github.com/davidsneighbour/nanny/commit/7a273677ec36084c29ac3479eaf4a54ece7040a8))
* **fix:** add author info to release workflow ([d2876bd](https://github.com/davidsneighbour/nanny/commit/d2876bddb6413b2bbfd1d1febafac8c12c4dca83))
* **fix:** add triggers and fixes to workflow ([11e4284](https://github.com/davidsneighbour/nanny/commit/11e4284ca275672caa719194cfc918a249c4fc28))
* **fix:** adding repository property to package.json for signed provenance ([7aae2f2](https://github.com/davidsneighbour/nanny/commit/7aae2f251a7a2ddb0fa865b26e656f795c382b26))
* **fix:** proper release config for npm package ([62499dc](https://github.com/davidsneighbour/nanny/commit/62499dced96dc77483a7a71ec1260b24fa17948e))
* **fix:** release and publish flow ([#6](https://github.com/davidsneighbour/nanny/issues/6)) ([ffb571a](https://github.com/davidsneighbour/nanny/commit/ffb571a2e10b21bdc15c1972caae7fbad72dd103))
* **fix:** release only manually ([c370550](https://github.com/davidsneighbour/nanny/commit/c3705506f790661bdca67f4c757be772615c5c5c))
* **fix:** release process and setup fixes ([b2d3368](https://github.com/davidsneighbour/nanny/commit/b2d3368695af2e364d4041a810c489ebf22fabe7))
* **fix:** update release workflow ([6f75619](https://github.com/davidsneighbour/nanny/commit/6f75619b2ce3fd106dbc134ee50de3098066dd7d))
* **fix:** update release workflow to build before release ([4972ab6](https://github.com/davidsneighbour/nanny/commit/4972ab68cfac4907c864735b7b1cd8d344c98dcf))
* switch to release-it or releases ([1fd9541](https://github.com/davidsneighbour/nanny/commit/1fd9541fd0686c9778d9a905b5a5a6b8939fab59))

### Chores

* **deps:** update actions/checkout action to v6 ([#2](https://github.com/davidsneighbour/nanny/issues/2)) ([5e14504](https://github.com/davidsneighbour/nanny/commit/5e1450442bae452cbc9885f5359b9e6cddde4701))
* **deps:** update actions/setup-node action to v6 ([fa13cb2](https://github.com/davidsneighbour/nanny/commit/fa13cb2ac2a99258045d3dd5c6618b0a8a89f49e))
* ignore .npmrc ([6db6eb0](https://github.com/davidsneighbour/nanny/commit/6db6eb0bbe3efe40a314cf62d315f0a66dce9917))

### CI

* **vscode:** update VSCode extensions ([222b063](https://github.com/davidsneighbour/nanny/commit/222b063afe7777cb3c497e5d86340a61ae144ed8))

### Refactoring

* remove glob in favour of fast-glob ([d6241a1](https://github.com/davidsneighbour/nanny/commit/d6241a178347f793302995db011522ebed34c7ba))

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.1.4](https://github.com/davidsneighbour/nanny/compare/v0.1.3...v0.1.4) (2026-02-22)

## [0.1.3](https://github.com/davidsneighbour/nanny/compare/v0.1.2...v0.1.3) (2026-02-22)

## [0.1.2](https://github.com/davidsneighbour/nanny/compare/v0.1.1...v0.1.2) (2026-02-22)
