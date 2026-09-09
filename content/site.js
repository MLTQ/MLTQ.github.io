/* MLTQ Archive — site-level configuration.
   Edit this file for anything that isn't a project or a post. */

export default {
  name: 'MLTQ Archive',
  homeTitle: 'Max Turnquist',
  tagline: 'PROJECTS',
  about:
    'Parallel development of tricks and tools. Some things here are finished; ' +
    'some are technically alive.',
  description:
    'Parallel systems and a field log: neural cellular automata, OSINT ' +
    'visualisation, audio-drama tooling, p2p meshes, and bench physics.',
  author: 'MLTQ',
  github: 'https://github.com/MLTQ',

  /* ---------------------------------------------------------------
     DOMAIN — the one thing to set once you've picked a name.
     Set it to the bare host, no protocol and no trailing slash:
         domain: 'azoa.online',
     Setting it makes the build emit CNAME, sitemap.xml, feed.xml and
     absolute og:url tags. Leaving it null skips those (the site still
     builds and works — every internal link is relative, so it runs
     from file://, from a subpath, or from a custom domain unchanged).
     --------------------------------------------------------------- */
  domain: 'azoa.online',

  /* Genera, in the order they appear down the page.
     `band` picks the colour: gray | lilac | green. */
  genera: [
    { id: 'biota',   label: 'BIOTA',   band: 'green', blurb: 'things that live' },
    { id: 'optica',  label: 'OPTICA',  band: 'gray',  blurb: 'things that watch' },
    { id: 'phonica', label: 'PHONICA', band: 'lilac', blurb: 'things that speak and sound' },
    { id: 'retia',   label: 'RETIA',   band: 'gray',  blurb: 'things that connect' },
    { id: 'campi',   label: 'CAMPI',   band: 'green', blurb: 'matter on the bench' },
    { id: 'strata',  label: 'STRATA',  band: 'lilac', blurb: 'representations underneath' },
  ],

  /* CHRONICA — the interleaved log. Newest first.
     `project` is a project slug (linked automatically) or null.
     Everything here also lands on chronica.html. */
  chronica: [
    { date: '2026.08.21', project: '1kee',      text: 'contour renderer online' },
    { date: '2026.08.17', project: 'jewels',    text: 'encoder passes first gate' },
    { date: '2026.08.09', project: 'bonsai',    text: 'rule pruning; the grid forgets gracefully' },
    { date: '2026.08.02', project: 'fusor',     text: 'flux conserver machined' },
    { date: '2026.07.31', project: 'jewels',    text: 'a burial (the voronoi arm)' },
    { date: '2026.07.20', project: 'ttb',       text: 'thrust rig v2' },
  ],

  /* Footer "ELSEWHERE" links. The RSS entry is added automatically
     once `domain` is set (a feed needs absolute URLs to be valid). */
  elsewhere: [
    { label: 'GitHub', href: 'https://github.com/MLTQ' },
    { label: 'Are.na', href: null },   // EDIT: add your URL, or delete the line
    { label: 'Mail',   href: null },   // EDIT: 'mailto:you@example.com'
  ],

  colophon:
    'set in Michroma &amp; Space Mono. Built by hand. No tracking.',
}
