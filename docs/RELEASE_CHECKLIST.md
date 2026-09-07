# Stable Release Checklist

## Brand and identity

- [ ] Final custom domain owned by the publisher
- [ ] Final reverse-DNS identifiers confirmed
- [ ] Production icon set and screenshots
- [ ] Publisher/legal entity name finalized for stores
- [ ] Support contact and privacy contact

## Web/PWA

- [ ] Production HTTPS host configured
- [ ] Service worker tested for offline launch
- [ ] Manifest icons/scope/start URL validated
- [ ] No runtime CDN dependencies
- [ ] No document upload endpoints
- [ ] CSP and security headers deployed
- [ ] Mobile Safari and Android Chrome smoke tests

## Windows

- [ ] Signed installer
- [ ] SmartScreen/reputation strategy documented
- [ ] Clean install/update/uninstall test
- [ ] GitHub Release artifacts and checksums

## macOS

- [ ] Apple Developer Program membership
- [ ] Developer ID signing
- [ ] Hardened Runtime
- [ ] Apple notarization
- [ ] Apple Silicon + Intel strategy confirmed
- [ ] DMG/pkg install and Gatekeeper tests

## Android

- [ ] Google Play Console developer account
- [ ] App signing configuration
- [ ] Internal testing track
- [ ] Data safety form consistent with local-first design
- [ ] File/provider permissions reviewed

## iOS

- [ ] Apple Developer Program membership
- [ ] Bundle ID/certificates/provisioning
- [ ] TestFlight beta
- [ ] App Privacy answers consistent with actual code
- [ ] Files/share-sheet flows tested

## Engineering

- [ ] Unit tests green
- [ ] Cross-platform PDF corpus tests green
- [ ] No high/critical dependency advisories
- [ ] THIRD_PARTY_NOTICES generated
- [ ] SBOM generated
- [ ] Release checksums generated
- [ ] Changelog generated
- [ ] Redaction security tests green
- [ ] Encryption corpus tests green
- [ ] Temporary-file cleanup verified
