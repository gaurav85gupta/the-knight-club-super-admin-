/**
 * Direct-to-Bunny upload (Phase 8). Sends the file with the TUS resumable
 * protocol STRAIGHT FROM THE BROWSER TO BUNNY using short-lived credentials
 * our backend minted for this one video. Our backend never sees a video byte.
 *
 *   browser --(API: small JSON)--> our backend --(management API)--> Bunny
 *   browser ================(TUS: the video bytes)================> Bunny
 *
 * What lives in memory only: the Upload object and the credentials. Nothing is
 * written to localStorage by US. (tus-js-client keeps a resume fingerprint in
 * localStorage by default; that is the file's fingerprint + Bunny's upload URL,
 * not a credential, and it is what makes an interrupted upload resumable.)
 */

const VideoUpload = (() => {
  if (typeof tus === 'undefined') {
    // Fail loudly and honestly rather than pretending uploads work.
    console.error('tus client failed to load; video upload is unavailable.');
  }

  /**
   * @param {File} file
   * @param {{endpoint,libraryId,videoId,expirationTime,signature}} creds
   * @param {{onProgress(pct:number, sent:number, total:number), onSuccess(), onError(err:Error, info:{status:number|null})}} cb
   * @returns {{ abort(): Promise<void> }}
   */
  function start(file, creds, cb) {
    if (typeof tus === 'undefined' || !tus.isSupported) {
      cb.onError(new Error('This browser cannot upload large videos.'), { status: null });
      return { abort: async () => {} };
    }

    const upload = new tus.Upload(file, {
      endpoint: creds.endpoint,
      // Backoff for flaky networks; tus resumes from the last acknowledged byte.
      retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
      headers: {
        AuthorizationSignature: creds.signature,
        AuthorizationExpire: String(creds.expirationTime),
        VideoId: creds.videoId,
        LibraryId: creds.libraryId,
      },
      metadata: { filetype: file.type || 'video/mp4', title: file.name },
      // Refresh-safe: a fingerprint per (file, video) so a NEW slot never
      // resumes an OLD video's upload.
      fingerprint: async () => ['tnc', creds.videoId, file.name, file.size, file.lastModified].join('-'),
      onError(error) {
        const status = error && error.originalResponse ? error.originalResponse.getStatus() : null;
        cb.onError(error, { status });
      },
      onProgress(sent, total) {
        cb.onProgress(total ? Math.min(100, Math.floor((sent / total) * 100)) : 0, sent, total);
      },
      onSuccess() {
        cb.onSuccess();
      },
    });

    // Resume only if a previous attempt exists FOR THIS video id.
    upload
      .findPreviousUploads()
      .then((prev) => {
        if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
        upload.start();
      })
      .catch(() => upload.start());

    return { abort: () => upload.abort(true).catch(() => {}) };
  }

  return { start, isSupported: () => typeof tus !== 'undefined' && Boolean(tus.isSupported) };
})();
