const paths = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  briefcase: 'M3 7h18v14H3z M8 7V3h8v4 M3 12h18 M10 12v3h4v-3',
  calendar: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16',
  bolt: 'M13 2 4 14h7l-1 8 10-13h-7z',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  plus: 'M12 5v14 M5 12h14',
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  chevron: 'm9 5 7 7-7 7',
  check: 'm5 12 4 4L19 6',
  clock: 'M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2 M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z',
  download: 'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5',
  upload: 'M12 16V4 m-5 5 5-5 5 5 M4 16v5h16v-5',
  close: 'm5 5 14 14 M5 19 19 5',
  edit: 'm4 16 12-12 4 4-12 12-5 1z M13 7l4 4',
  archive: 'M3 3h18v5H3z M5 8v13h14V8 M10 12h4',
  list: 'M8 5h13 M8 12h13 M8 19h13 M3 5h1 M3 12h1 M3 19h1',
  board: 'M3 3h5v18H3z M10 3h5v12h-5z M17 3h4v16h-4z',
  shield: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6z m-5 10 3 3 6-6',
  mail: 'M3 5h18v14H3z M3 5l9 8 9-8',
  external: 'M14 3h7v7 M21 3 10 14 M10 3H3v18h18v-7',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  refresh: 'M20 7a9 9 0 1 0 1 10 M20 2v6h-6',
  note: 'M5 3h14v18H5z M8 8h8 M8 12h8 M8 16h5',
};
export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name] || paths.note}"/></svg>`;
}
