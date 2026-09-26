import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const profile = read('data/profile.json');
const papers = read('data/publications.json');
const escape = (value = '') => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const icon = (kind) => {
  const paths = {
    email: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m3 6 9 7 9-7"/>',
    location: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    university: '<path d="m2 7 10-5 10 5H2Zm1 13h18M2 22h20M5 10v7m5-7v7m4-7v7m5-7v7"/>',
    scholar: '<path d="m2 9 10-6 10 6-10 6Z"/><path d="M6 12v6c4 3 8 3 12 0v-6M22 9v8"/>',
    github: '<path d="M9 20c-5 1-5-3-7-3m14 6v-4a3.5 3.5 0 0 0-1-3c3-.4 6-1.4 6-7a5 5 0 0 0-1.5-3.5A4.6 4.6 0 0 0 19.4 2S18.2 1.6 16 3a13 13 0 0 0-8 0C5.8 1.6 4.6 2 4.6 2a4.6 4.6 0 0 0-.1 3.5A5 5 0 0 0 3 9c0 5.6 3 6.6 6 7a3.5 3.5 0 0 0-1 3v4"/>',
    arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    pdf: '<path d="M14 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>'
  };
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[kind] || paths.arrow}</svg>`;
};
const external = (url, label, kind = 'arrow') => `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${kind ? icon(kind) : ''}${escape(label)}</a>`;
const paperIds = new Set();
for (const paper of papers) {
  if (paperIds.has(paper.id)) throw new Error(`Duplicate publication: ${paper.id}`);
  paperIds.add(paper.id);
  if ('pdf' in paper) throw new Error(`Private PDF paths must not be included in public data: ${paper.id}`);
  if (paper.figure && (!paper.figure.startsWith('assets/figures/') || !/\.(webp|png|jpe?g)$/i.test(paper.figure) || !fs.existsSync(path.join(root, paper.figure)))) throw new Error(`Invalid thumbnail: ${paper.id}`);
  for (const key of ['arxiv', 'preprint', 'project', 'code']) {
    if (!paper[key]) continue;
    const url = new URL(paper[key]);
    const allowed = ['arxiv.org', 'github.com', 'zenodo.org', 'papers.ssrn.com'].includes(url.hostname) || (url.hostname === 'doi.org' && url.pathname.startsWith('/10.5281/zenodo.'));
    if (url.protocol !== 'https:' || !allowed) throw new Error(`Only public research platforms may be linked: ${paper.id}/${key}`);
  }
  if (!paper.arxiv && !paper.preprint && (paper.project || paper.code)) throw new Error(`Unpublished papers must not have links: ${paper.id}`);
  if (paper.date && !/^\d{4}-(0[1-9]|1[0-2])$/.test(paper.date)) throw new Error(`Invalid date: ${paper.id}`);
  if (!paper.date && paper.dateKind !== 'accepted') throw new Error(`Missing date: ${paper.id}`);
  if (!paper.title || !Array.isArray(paper.authors)) throw new Error(`Missing metadata: ${paper.id}`);
  if (!paper.authors.length && !paper.authorNote) throw new Error(`Unexplained missing authors: ${paper.id}`);
}
// A pending acceptance date has no invented month. Confirm it in publications.json.
const dateKindPriority = { accepted: 0, arxiv: 1, preprint: 1, completed: 2 };
papers.sort((a, b) => (b.date || '').localeCompare(a.date || '') || dateKindPriority[a.dateKind] - dateKindPriority[b.dateKind] || a.title.localeCompare(b.title));
const isProfileAuthor = (author) => [profile.name, profile.publicationName].includes(typeof author === 'string' ? author : author.name);
const authorHTML = (author) => {
  const isSelf = isProfileAuthor(author);
  const name = escape(isSelf ? profile.name : (typeof author === 'string' ? author : author.name));
  const formatted = isSelf ? `<strong>${name}</strong>` : name;
  const contribution = author.contribution || (author.equal ? 'Equal contribution' : '');
  return formatted + (contribution ? `<sup class="equal-marker" title="${escape(contribution)}" aria-label="${escape(contribution)}">*</sup>` : '');
};
const paperHTML = (paper) => {
  const isAccepted = paper.dateKind === 'accepted';
  const figureSource = paper.figure ? `${paper.figure}?v=${createHash('sha256').update(fs.readFileSync(path.join(root, paper.figure))).digest('hex').slice(0, 10)}` : '';
  const date = paper.date ? `<time datetime="${paper.date}">${paper.date.replace('-', '.')}</time>` : '<span class="pending-date">Date pending</span>';
  const links = [];
  if (paper.arxiv) links.push(external(paper.arxiv, 'arXiv', ''));
  if (paper.preprint) links.push(external(paper.preprint, 'Pre-print', ''));
  if (paper.project) links.push(external(paper.project, 'GitHub', ''));
  if (paper.code) links.push(external(paper.code, 'Code', ''));
  let authors = paper.authors.length ? `<p class="authors">${paper.authors.map(authorHTML).join(', ')}</p>` : '';
  if (paper.authors.length > 18) {
    const featuredAuthor = paper.authors.find(isProfileAuthor);
    const excerpt = [...paper.authors.slice(0, 2).map(authorHTML), '…', ...(featuredAuthor ? [authorHTML(featuredAuthor)] : []), 'et al.'].join(', ');
    authors = `<details class="author-details"><summary><span class="authors">${excerpt}</span><span class="author-toggle"><span class="more">All ${paper.authors.length} authors</span><span class="less">Fewer authors</span>${icon('chevron')}</span></summary>${authors}</details>`;
  }
  return `<article class="publication${isAccepted ? ' is-accepted' : ''}" id="${escape(paper.id)}" data-date="${escape(paper.date)}" data-date-kind="${paper.dateKind}">
          <div class="paper-visual">${paper.figure ? `<img class="paper-figure" src="${escape(figureSource)}" alt="${escape(paper.figureAlt || `Main figure of ${paper.shortName}`)}" width="224" height="168" loading="lazy">` : ''}<div class="paper-date">${date}${isAccepted ? '<span class="date-kind">Accepted</span>' : ''}</div></div>
          <div class="paper-content">
            <div class="paper-header"><span class="venue${isAccepted ? '' : ' preprint'}">${isAccepted ? `${icon('check')}Accepted · ` : ''}${escape(paper.venue)}</span><span class="paper-name">${escape(paper.shortName)}</span></div>
            <h3>${paper.arxiv || paper.preprint ? `<a href="${escape(paper.arxiv || paper.preprint)}" target="_blank" rel="noopener noreferrer">${escape(paper.title)}</a>` : escape(paper.title)}</h3>
            ${authors}${paper.contributionNote ? `\n            <p class="contribution-note"><span class="equal-marker">*</span> ${escape(paper.contributionNote)}</p>` : ''}
            <p class="paper-summary">${escape(paper.summary)}</p>
            ${links.length ? `<div class="paper-links">${links.join('\n              ')}</div>` : ''}
          </div>
        </article>`;
};
const scholarLink = profile.scholar ? external(profile.scholar, 'Google Scholar', 'scholar') : '';
const introHTML = escape(profile.intro)
  .replace('Peking University', '<strong>Peking University</strong>')
  .replace(escape(profile.advisor.name), () => `<strong>${external(profile.advisor.url, profile.advisor.name, '')}</strong>`)
  .replace(escape(profile.group.name), () => external(profile.group.url, profile.group.name, ''));
const hasEqual = papers.some(p => p.authors.some(a => a.equal));
const cssVersion = createHash('sha256').update(fs.readFileSync(path.join(root, 'assets/style.css'))).digest('hex').slice(0, 10);
const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(profile.name)} | ${escape(profile.affiliation)}</title>
  <meta name="description" content="${escape(profile.name)} — ${escape(profile.affiliation)}. Research in reinforcement learning, large language models, and autonomous agents for long-horizon tasks.">
  <meta name="theme-color" content="#111315">
  <link rel="canonical" href="${escape(profile.siteUrl)}">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${escape(profile.name)} | Academic Homepage">
  <meta property="og:description" content="Reinforcement learning, large language models, and autonomously evolving agents for long-horizon tasks.">
  <meta property="og:url" content="${escape(profile.siteUrl)}">
  <meta property="og:image" content="${escape(profile.siteUrl)}assets/portrait.jpg">
  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
  <link rel="stylesheet" href="assets/style.css?v=${cssVersion}">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="wordmark" href="#about">${escape(profile.name)}</a>
      <nav aria-label="Main navigation"><a href="#about">About</a><a href="#publications">Publications</a></nav>
    </div>
  </header>
  <div class="page-layout">
    <aside class="profile-sidebar" aria-label="Personal profile">
      <img class="profile-photo" src="assets/portrait.jpg" alt="Portrait of ${escape(profile.name)}" width="212" height="274">
      <div class="profile-details">
        <p class="profile-name">${escape(profile.name)}</p>
        <p class="profile-interests">${profile.sidebarInterests.map(s => `<span>${escape(s)}</span>`).join(' <span class="interest-separator" aria-hidden="true">·</span> ')}</p>
        <div class="profile-meta">
          <p class="profile-location">${icon('location')}<span>${escape(profile.location)}</span></p>
          <p class="profile-institution">${icon('university')}<span>${escape(profile.institution)}</span></p>
        </div>
        <div class="profile-links" aria-label="Profile links">
          <a href="mailto:${escape(profile.email)}">${icon('email')}Email</a>
          ${scholarLink}
          ${external(profile.github, 'GitHub', 'github')}
        </div>
      </div>
    </aside>
    <main id="main">
      <section class="about" id="about" aria-labelledby="about-heading">
        <div class="identity">
          <p class="eyebrow">${escape(profile.affiliation)}</p>
          <h1 id="name">${escape(profile.name)}${profile.nameChinese ? ` <span class="chinese-name" lang="zh-CN">${escape(profile.nameChinese)}</span>` : ''}</h1>
        </div>
        <h2 id="about-heading">About Me</h2>
        <div class="bio-text"><p>${introHTML}</p><p>${escape(profile.research)}</p><p>${escape(profile.vision)}</p></div>
      </section>
    <section class="interests" aria-labelledby="interests-heading"><h2 class="interests-label" id="interests-heading">Research interests</h2>${profile.interests.map(s => `<span class="interest">${escape(s)}</span>`).join('')}</section>
    <section id="publications" aria-labelledby="publications-heading">
      <div class="section-heading"><h2 id="publications-heading">Selected Papers</h2></div>
      ${hasEqual ? '<p class="section-note"><span class="equal-marker">*</span> Equal contribution, unless otherwise noted.</p>' : ''}
      <div class="publications">${papers.map(paperHTML).join('\n        ')}</div>
    </section>
      <footer class="site-footer"><span>© ${escape(profile.name)}</span><span>${escape(profile.affiliation)}</span></footer>
    </main>
  </div>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'index.html'), page);
console.log(`Built index.html with ${papers.length} publications.`);
console.log(`Order: ${papers.map(p => `${p.date || '(date pending)'} ${p.shortName}`).join(' | ')}`);
if (!profile.scholar) console.log('Pending: Google Scholar profile URL.');
for (const paper of papers.filter(p => !p.date)) console.log(`Pending: ${paper.shortName} acceptance month.`);
