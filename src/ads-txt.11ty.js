// ads.txt: Panel → Site ayarları → Reklam → ads.txt satırları doluysa üretilir
export default class {
  data() {
    return { permalink: d => ((d.site.ads && d.site.ads.adsTxt || '').trim() ? '/ads.txt' : false), eleventyExcludeFromCollections: true };
  }
  render(d) { return d.site.ads.adsTxt.trim() + '\n'; }
}
