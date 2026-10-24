import { useEffect, useState } from 'react';
import type { Asset } from '../data/types';
import { assetUrl } from '../store/storage';

export function useAssetUrl(a?: Pick<Asset, 'store' | 'ref'> | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!a) {
      setUrl(null);
      return;
    }
    assetUrl(a).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [a?.store, a?.ref]);
  return url;
}

export function AssetImage({ asset, alt, className, style, draggable }: { asset?: Asset | null; alt?: string; className?: string; style?: React.CSSProperties; draggable?: boolean }) {
  const url = useAssetUrl(asset);
  const [broken, setBroken] = useState(false);
  if (!asset || !url || broken)
    return <span className={'asset-missing ' + (className ?? '')} style={style} aria-label={alt ?? 'Imagem indisponível'} />;
  return <img src={url} alt={alt ?? asset.name} className={className} style={style} draggable={draggable} onError={() => setBroken(true)} loading="lazy" />;
}
