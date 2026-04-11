/** Oficjalne sklepy — aplikacja Honly (klient) */
export const HONLY_APP_STORE_URL = "https://apps.apple.com/us/app/honly/id6760712614";
export const HONLY_PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=pl.mirit.honly&hl=pl";

/**
 * Zrzuty z Google Play — parametr `=w1080-h2340` daje pełny portret telefonu (bez przycinania
 * do paska jak przy starym `w1052-h592`).
 */
export const HONLY_PLAY_SCREENSHOTS = [
  "https://play-lh.googleusercontent.com/fXfhZdGBwWQKpEqOO7lAEUqx_gomynLtSwR-SEVZqpamMoLMKvnHxYYjatzvGcyWoUeIBlriNCh43u-987_TEQ=w1080-h2340",
  "https://play-lh.googleusercontent.com/b-7i_oF5ZuGIfC1iKRTVemHpDziUYzhKA8Qu2mA0Q53HWt5G0cg5aSjDvy8a1peDKubKe8SByLccUSWm7z4PWw=w1080-h2340",
  "https://play-lh.googleusercontent.com/zz-0CelLx33vPH1x1FOehZjeM7apyGzAAajSTTgifrehBc3BCiVJgg97ThlhWVj7ORC5HRzMyMfc_D9s-20P=w1080-h2340",
  "https://play-lh.googleusercontent.com/2UPxgx8iGikvGcCelSxXFDpBcWbQMzgTFmLgiGz0uswoTVt43dMr5hzu8bmLrvyotP5LACaF3zrGMzCIKCJ-xA=w1080-h2340",
  "https://play-lh.googleusercontent.com/slv4sxhyvabCZDXUpgn57wGgjxzaM3UoQnmTLE29zJAoJuuyOFKRLF7NkNDwMXi6FBMJhMQ_xLCjnoW-1BAFcg=w1080-h2340",
  "https://play-lh.googleusercontent.com/-ZFupc08NQ8u70Tw4ZH60-FVQdIO47TbrbnJiTWHF0u7SeVS1P5HbIjUmFioZn5_SgWOydGjy6eXNQvQT-jmjg=w1080-h2340",
] as const;

/** Grafika / ikona aplikacji z App Store (iTunes API). */
export const HONLY_APPLE_APP_ICON =
  "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/ff/53/b5/ff53b5c1-48ba-fbb5-e5c4-b6c605179eea/AppIcon-0-0-1x_U007ephone-0-11-0-85-220.png/180x180bb.jpg";
