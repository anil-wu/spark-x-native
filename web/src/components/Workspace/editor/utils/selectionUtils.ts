export const getSelectedIds = (selectedId: string | null, selectedIds: string[]) => {
  const ids = new Set<string>();
  for (const id of selectedIds) {
    if (id) {
      ids.add(id);
    }
  }
  if (selectedId) {
    ids.add(selectedId);
  }
  return Array.from(ids);
};

export const normalizeSelection = (ids: string[]) => {
  const uniq = Array.from(new Set(ids.filter(Boolean)));

  if (uniq.length === 0) {
    return { selectedId: null as string | null, selectedIds: [] as string[] };
  }

  if (uniq.length === 1) {
    return { selectedId: uniq[0], selectedIds: [] as string[] };
  }

  return { selectedId: null as string | null, selectedIds: uniq };
};

export const toggleId = (ids: string[], id: string) => {
  if (!id) {
    return ids;
  }
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
};
