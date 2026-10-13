# Vendored third-party scripts

Self-hosted on purpose: this is a privileged admin console, so it loads no
script from a third-party CDN at runtime (supply-chain risk). Update by
re-copying from the package and updating the hash below.

| File | Package | Version | License | SHA-256 |
|------|---------|---------|---------|---------|
| tus.min.js | tus-js-client | 4.3.1 | MIT | 8cbb1b63fccc3bba0ae73ad1deb160ce046c3750851d0c3e94921ae3ef070eb8 |

Purpose: resumable (TUS) upload of lesson videos DIRECTLY from the browser to
Bunny Stream (Phase 8). The video never passes through our backend.
