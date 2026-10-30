// Tarif sayfaları: adres, şablon ve SEO alanları
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/[\s,.;:]+\S*$/, '') + '…');
export default {
  layout: 'recipe.njk',
  permalink: '/tarif/{{ page.fileSlug }}/',
  eleventyComputed: {
    // Tarifte ayrıca belirtilmemişse editör kontrolü genel yayın yönetmenine aittir (src/_data/authors.json)
    editor: d => d.editor || 'sitki-pehlivan',
    seoTitle: d => `${d.title} tarifi: Nasıl yapılır?`,
    seoDesc: d => {
      const total = (d.prep || 0) + (d.cook || 0);
      const base = (d.desc || '').replace(/\s+$/, '');
      return clip(`${base}${/[.!?]$/.test(base) ? '' : '.'} ${total} dakikada, ${d.serv} kişilik ${d.title.toLocaleLowerCase('tr')} tarifi: malzemeler ve adım adım yapılışı.`, 158);
    }
  }
};
