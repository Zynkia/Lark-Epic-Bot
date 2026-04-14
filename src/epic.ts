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
      if (!game.promotions) continue;

      const promotionalOffers = game.promotions.promotionalOffers || [];
      for (const promo of promotionalOffers) {
        const offers = promo.promotionalOffers || [];
        for (const offer of offers) {
          const discountedPrice = game.price?.totalPrice?.discountPrice ?? 0;

          if (discountedPrice !== 0) continue;

          let urlSlug = null;
          if (game.catalogNs?.mappings?.length > 0) {
            const mapping = game.catalogNs.mappings.find((m: any) => m.pageSlug);
            if (mapping) urlSlug = mapping.pageSlug;
          }

          if (!urlSlug) continue;

          const imageUrl = game.keyImages?.[0]?.url || '';

          // Create a unique ID for the game
          const id = `${game.title}_${offer.endDate}`.replace(/\s+/g, '_');

          freeGames.push({
            id,
            title: game.title,
            description: game.description || 'No description available.',
            image_url: imageUrl,
            url: `https://store.epicgames.com/${locale}/p/${urlSlug}`,
            start_date: offer.startDate,
            end_date: offer.endDate,
          });
        }
      }
    }

    return freeGames;
  } catch (e) {
    console.error(`Error fetching free games: ${e}`);
    return [];
  }
}
