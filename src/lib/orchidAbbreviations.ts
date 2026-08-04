export const GENUS_ABBREVIATIONS: Record<string, string[]> = {
  Cattleya: ["C.", "C"],
  Dendrobium: ["Den.", "Den"],
  Oncidium: ["Onc.", "Onc"],
  Paphiopedilum: ["Paph.", "Paph"],
  Phalaenopsis: ["Phal.", "Phal"],
  Cymbidium: ["Cym.", "Cym"],
  Vanda: ["V.", "V"],
  Miltonia: ["Milt.", "Milt"],
  Brassia: ["Brs.", "Brs"],
  Epidendrum: ["Epi.", "Epi"],
  Laelia: ["L.", "L"],
  Masdevallia: ["Masd.", "Masd"],
  Odontoglossum: ["Odm.", "Odm"],
  Zygopetalum: ["Zygo.", "Zygo"],
};

export function abbreviationsFor(genus: string): string[] {
  return GENUS_ABBREVIATIONS[genus] ?? [];
}
