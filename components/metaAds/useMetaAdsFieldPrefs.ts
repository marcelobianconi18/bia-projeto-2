import { useMemo, useState } from 'react';
import { META_ADS_FIELDS, MetaAdsFieldId } from './metaAdsFields';

type PrefState = {
  order: MetaAdsFieldId[];
  visible: Record<MetaAdsFieldId, boolean>;
};

const DEFAULT_STATE: PrefState = {
  order: META_ADS_FIELDS.map((f) => f.id),
  visible: META_ADS_FIELDS.reduce((acc, f) => {
    acc[f.id] = f.defaultVisible;
    return acc;
  }, {} as Record<MetaAdsFieldId, boolean>)
};

const STORAGE_KEY = 'bia_meta_ads_fields_v1';

const loadPrefs = (): PrefState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.order || !parsed.visible) return DEFAULT_STATE;
    return parsed;
  } catch {
    return DEFAULT_STATE;
  }
};

const savePrefs = (state: PrefState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage is optional; ignore failures
  }
};

export const useMetaAdsFieldPrefs = () => {
  const [prefs, setPrefs] = useState<PrefState>(() => loadPrefs());

  const orderedFields = useMemo(() => {
    const map = new Map(META_ADS_FIELDS.map((f) => [f.id, f]));
    return prefs.order.map((id) => map.get(id)).filter(Boolean);
  }, [prefs.order]);

  const toggleVisibility = (id: MetaAdsFieldId) => {
    setPrefs((prev) => {
      const next = {
        ...prev,
        visible: { ...prev.visible, [id]: !prev.visible[id] }
      };
      savePrefs(next);
      return next;
    });
  };

  const moveField = (id: MetaAdsFieldId, direction: 'up' | 'down') => {
    setPrefs((prev) => {
      const idx = prev.order.indexOf(id);
      if (idx === -1) return prev;
      const nextOrder = [...prev.order];
      const swapWith = direction === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= nextOrder.length) return prev;
      [nextOrder[idx], nextOrder[swapWith]] = [nextOrder[swapWith], nextOrder[idx]];
      const next = { ...prev, order: nextOrder };
      savePrefs(next);
      return next;
    });
  };

  const resetDefaults = () => {
    setPrefs(() => {
      savePrefs(DEFAULT_STATE);
      return DEFAULT_STATE;
    });
  };

  return {
    prefs,
    orderedFields,
    toggleVisibility,
    moveField,
    resetDefaults
  };
};
