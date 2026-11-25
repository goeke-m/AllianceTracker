// Test-only: builds a minimal lastwarrank.com alliance page.
const HEADER = ['#', 'Commander', 'Rank', 'Country', 'Hero Power', 'Power', 'Base']

export function alliancePage(rows: [string, string][]): string {
  const head = HEADER.map((h) => `<th scope="col"><span>${h}</span></th>`).join('')
  const body = rows
    .map(
      ([name, hp], i) =>
        `<tr><td>${i + 1}</td><td><a href="/player/x">${name}</a></td><td>R<!-- -->4</td>` +
        `<td>US</td><td>${hp}</td><td>400M</td><td>35</td></tr>`
    )
    .join('')
  return `<html><body><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`
}
