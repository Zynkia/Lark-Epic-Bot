export interface EpicGame {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url: string;
  start_date: string;
  end_date: string;
}

export async function fetchFreeGames(larkApiBase: string): Promise<EpicGame[]> {
  const isFeishu = larkApiBase.includes('feishu.cn');
  const locale = isFeishu ? 'zh-CN' : 'en-US';
  const country = isFeishu ? 'CN' : 'US';
  const url = `https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=${locale}&country=${country}&allowCountries=${country}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Error fetching free games: ${response.statusText}`);
      return [];
    }

    const data = await response.json() as any;
    const games: any[] = data?.data?.Catalog?.searchStore?.elements;

    if (!games) {
      return [];
    }

    const freeGames: EpicGame[] = [];

    for (const game of games) {
      const categories = game.categories?.map((c: any) => c.path) || [];
      if (!categories.includes('freegames')) continue;

      let startDate = game.effectiveDate;
      let endDate = game.expiryDate;

      // Extract all current and upcoming promos
      const extractPromos = (promoNodes: any[]) => {
        const offers: any[] = [];
        for (const node of promoNodes || []) {
          for (const offer of node.promotionalOffers || []) {
            offers.push(offer);
          }
        }
        return offers;
      };

      const currentPromos = extractPromos(game.promotions?.promotionalOffers);

      // Find the free promo (discountPercentage === 0)
      const freeCurrentPromo = currentPromos.find(p => p.discountSetting?.discountPercentage === 0);

      const activePromo = freeCurrentPromo;

      if (activePromo) {
        startDate = activePromo.startDate;
        endDate = activePromo.endDate;
      }

      const originalPrice = game.price?.totalPrice?.originalPrice ?? 0;
      const discountPrice = game.price?.totalPrice?.discountPrice ?? 0;
      
      const isCurrentlyFree = originalPrice > 0 && discountPrice === 0;
      const isVaultedFree = originalPrice === 0 && discountPrice === 0 && freeCurrentPromo;

      // Only process games that are currently free, skip upcoming games
      if (!isCurrentlyFree && !isVaultedFree) continue;

      let urlSlug = game.catalogNs?.mappings?.[0]?.pageSlug 
                    || game.productSlug 
                    || game.urlSlug;

      if (!urlSlug || urlSlug === '[]') {
        urlSlug = 'free-games'; 
      }

      const imageTypes = ['OfferImageWide', 'DieselStoreFrontWide', 'OfferImageTall', 'Thumbnail'];
      let imageUrl = '';
      for (const type of imageTypes) {
        const img = game.keyImages?.find((i: any) => i.type === type);
        if (img?.url) {
          imageUrl = img.url;
          break;
        }
      }
      if (!imageUrl) imageUrl = game.keyImages?.[0]?.url || '';

      const id = `${game.title}_${endDate || 'unknown'}`.replace(/\s+/g, '_');

      freeGames.push({
        id,
        title: game.title,
        description: game.description || 'No description available.',
        image_url: imageUrl,
        url: `https://store.epicgames.com/${locale}/p/${urlSlug}`,
        start_date: startDate,
        end_date: endDate || '',
      });
    }

    return freeGames;
  } catch (e) {
    console.error(`Error fetching free games: ${e}`);
    return [];
  }
}