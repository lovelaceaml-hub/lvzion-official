# Words of Mother’s Love Healing Concert

A dependency-free, single-screen registration landing page. The promo panel, event details, and one official member registration button fit without scrolling at the tested phone and desktop sizes. The illustrated landscape includes animated hearts and music, Pause Motion, and automatic support for Reduce Motion.

## Preview or integrate

Serve this directory as a static site, using `index.html` as the entry point. For a local check:

```sh
python3 -m http.server 8080
```

Open <http://localhost:8080>. No build step or form backend is needed. Member registration links to <https://lvz.app/modules/concert>. Guests use the personal invitation link from their host. This page does not collect personal data.

## Attach authorized media in a private environment

The approved video, any video-derived poster, and private media references are deliberately omitted from this source. The included `promo-poster.svg` is independently drawn artwork. For an authorized private deployment only:

1. Place your authorized MP4 beside `index.html` as `concert-promo.mp4`.
2. In the deployed copy of `index.html` (not the public repository), add `<meta name="concert-promo-path" content="./concert-promo.mp4">` inside `<head>`. A same-origin authorized media endpoint also works.
3. Verify private access and playback. The inline player has controls, does not autoplay, and does not preload the full video. If playback reports an error, it reverts to the static placeholder.

Keep all private media, URLs and identifiers out of the Git repository.
