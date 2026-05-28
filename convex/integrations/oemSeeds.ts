// Catalog estático URLs públicas brochures OEM. Cobertura 4 módulos RMP:
//   MTO — Mantenimiento (camiones generales)
//   REC — Recolección (compactadores, refuse)
//   LIM — Limpieza (barredoras, sweepers)
//   FUM — Fumigación (sprayers, foggers)
//
// robots.txt pre-verificado para cada dominio. Crawler dedup por content_hash.
// URLs pueden cambiar — si 404, kb_health_alert tipo="stale_url".

export interface OemSeed {
  url: string;
  make: string;
  model: string;
  year?: number;
  equipment_class: string;
  module: "MTO" | "REC" | "LIM" | "FUM";
  source_label: string;
}

export const OEM_SEEDS: OemSeed[] = [
  // ═══════════════ MTO — Camiones generales ═══════════════
  // Volvo Trucks NA
  { url: "https://www.volvotrucks.us/-/media/vtna/files/shared/trucks/vnl/vtna_vnl_brochure_2024.pdf", make: "Volvo", model: "VNL", equipment_class: "camion_carga", module: "MTO", source_label: "Volvo VNL brochure 2024" },
  { url: "https://www.volvotrucks.us/-/media/vtna/files/shared/trucks/vnr/vtna_vnr_brochure.pdf", make: "Volvo", model: "VNR", equipment_class: "camion_carga", module: "MTO", source_label: "Volvo VNR brochure" },
  { url: "https://www.volvotrucks.us/-/media/vtna/files/shared/trucks/vhd/vtna_vhd_brochure.pdf", make: "Volvo", model: "VHD", equipment_class: "camion_carga", module: "MTO", source_label: "Volvo VHD brochure" },
  // Peterbilt
  { url: "https://www.peterbilt.com/sites/default/files/2023-03/567-spec-sheet.pdf", make: "Peterbilt", model: "567", equipment_class: "camion_carga", module: "MTO", source_label: "Peterbilt 567 spec" },
  { url: "https://www.peterbilt.com/sites/default/files/2023-03/579-spec-sheet.pdf", make: "Peterbilt", model: "579", equipment_class: "camion_carga", module: "MTO", source_label: "Peterbilt 579 spec" },
  { url: "https://www.peterbilt.com/sites/default/files/2023-03/389-spec-sheet.pdf", make: "Peterbilt", model: "389", equipment_class: "camion_carga", module: "MTO", source_label: "Peterbilt 389 spec" },
  // Kenworth
  { url: "https://www.kenworth.com/media/3434/t880-brochure.pdf", make: "Kenworth", model: "T880", equipment_class: "camion_carga", module: "MTO", source_label: "Kenworth T880 brochure" },
  { url: "https://www.kenworth.com/media/3435/t680-brochure.pdf", make: "Kenworth", model: "T680", equipment_class: "camion_carga", module: "MTO", source_label: "Kenworth T680 brochure" },
  { url: "https://www.kenworth.com/media/3436/w900-brochure.pdf", make: "Kenworth", model: "W900", equipment_class: "camion_carga", module: "MTO", source_label: "Kenworth W900 brochure" },
  // Freightliner
  { url: "https://freightliner.com/content/dam/freightliner/literature/m2-business-class-brochure.pdf", make: "Freightliner", model: "M2", equipment_class: "camion_carga", module: "MTO", source_label: "Freightliner M2 brochure" },
  { url: "https://freightliner.com/content/dam/freightliner/literature/cascadia-brochure.pdf", make: "Freightliner", model: "Cascadia", equipment_class: "camion_carga", module: "MTO", source_label: "Freightliner Cascadia brochure" },
  // Mack (también REC)
  { url: "https://www.macktrucks.com/-/media/files/brochures/anthem/mack-anthem-brochure.pdf", make: "Mack", model: "Anthem", equipment_class: "camion_carga", module: "MTO", source_label: "Mack Anthem brochure" },
  { url: "https://www.macktrucks.com/-/media/files/brochures/pinnacle/mack-pinnacle-brochure.pdf", make: "Mack", model: "Pinnacle", equipment_class: "camion_carga", module: "MTO", source_label: "Mack Pinnacle brochure" },
  // International / Navistar
  { url: "https://www.internationaltrucks.com/-/media/files/literature/hv-series-brochure.pdf", make: "International", model: "HV", equipment_class: "camion_carga", module: "MTO", source_label: "International HV brochure" },
  { url: "https://www.internationaltrucks.com/-/media/files/literature/mv-series-brochure.pdf", make: "International", model: "MV", equipment_class: "camion_carga", module: "MTO", source_label: "International MV brochure" },
  // Isuzu Commercial (cab-over LatAm)
  { url: "https://www.isuzucv.com/sites/default/files/2023-05/N-Series-Standard-Cab.pdf", make: "Isuzu", model: "NPR", equipment_class: "camion_carga", module: "MTO", source_label: "Isuzu NPR cab-over spec" },
  { url: "https://www.isuzucv.com/sites/default/files/2023-05/F-Series-FTR.pdf", make: "Isuzu", model: "FTR", equipment_class: "camion_carga", module: "MTO", source_label: "Isuzu FTR spec" },
  // Hino
  { url: "https://www.hino.com/uploads/2023/files/hino-338-specs.pdf", make: "Hino", model: "338", equipment_class: "camion_carga", module: "MTO", source_label: "Hino 338 spec" },
  { url: "https://www.hino.com/uploads/2023/files/hino-268-specs.pdf", make: "Hino", model: "268", equipment_class: "camion_carga", module: "MTO", source_label: "Hino 268 spec" },
  // Mercedes-Benz Trucks (Daimler) — LatAm comunes
  { url: "https://www.mercedes-benz-trucks.com/content/dam/mb-trucks/markets/intl/brochures/actros-l-brochure.pdf", make: "Mercedes-Benz", model: "Actros", equipment_class: "camion_carga", module: "MTO", source_label: "Mercedes Actros brochure" },
  { url: "https://www.mercedes-benz-trucks.com/content/dam/mb-trucks/markets/intl/brochures/atego-brochure.pdf", make: "Mercedes-Benz", model: "Atego", equipment_class: "camion_carga", module: "MTO", source_label: "Mercedes Atego brochure" },
  // MAN
  { url: "https://www.man.eu/ntg_media/media/en/content_medien/doc/global_corporate_website/products/man-tgs-brochure.pdf", make: "MAN", model: "TGS", equipment_class: "camion_carga", module: "MTO", source_label: "MAN TGS brochure" },
  // Iveco
  { url: "https://www.iveco.com/Documents/heavy-duty/S-WAY/IVECO_S-WAY_Brochure.pdf", make: "Iveco", model: "S-Way", equipment_class: "camion_carga", module: "MTO", source_label: "Iveco S-Way brochure" },
  { url: "https://www.iveco.com/Documents/heavy-duty/T-WAY/IVECO_T-WAY_Brochure.pdf", make: "Iveco", model: "T-Way", equipment_class: "camion_carga", module: "MTO", source_label: "Iveco T-Way brochure" },
  // Scania
  { url: "https://www.scania.com/content/dam/scanianoe/market/master/brochures/scania-r-series-brochure.pdf", make: "Scania", model: "R-Series", equipment_class: "camion_carga", module: "MTO", source_label: "Scania R-Series brochure" },

  // ═══════════════ REC — Recolección (compactadores) ═══════════════
  // Mack refuse (especializado)
  { url: "https://www.macktrucks.com/-/media/files/brochures/granite/mack-granite-brochure.pdf", make: "Mack", model: "Granite", equipment_class: "compactador", module: "REC", source_label: "Mack Granite brochure" },
  { url: "https://www.macktrucks.com/-/media/files/brochures/lr/mack-lr-electric-brochure.pdf", make: "Mack", model: "LR", equipment_class: "compactador", module: "REC", source_label: "Mack LR refuse brochure" },
  { url: "https://www.macktrucks.com/-/media/files/brochures/terrapro/mack-terrapro-brochure.pdf", make: "Mack", model: "TerraPro", equipment_class: "compactador", module: "REC", source_label: "Mack TerraPro brochure" },
  { url: "https://www.macktrucks.com/-/media/files/brochures/md/mack-md-series-brochure.pdf", make: "Mack", model: "MD", equipment_class: "compactador", module: "REC", source_label: "Mack MD brochure" },
  // Peterbilt refuse
  { url: "https://www.peterbilt.com/sites/default/files/2023-03/520-spec-sheet.pdf", make: "Peterbilt", model: "520", equipment_class: "compactador", module: "REC", source_label: "Peterbilt 520 refuse spec" },
  // Freightliner refuse
  { url: "https://freightliner.com/content/dam/freightliner/literature/108sd-brochure.pdf", make: "Freightliner", model: "108SD", equipment_class: "compactador", module: "REC", source_label: "Freightliner 108SD brochure" },
  { url: "https://freightliner.com/content/dam/freightliner/literature/114sd-brochure.pdf", make: "Freightliner", model: "114SD", equipment_class: "compactador", module: "REC", source_label: "Freightliner 114SD brochure" },
  // Heil (body)
  { url: "https://www.heil.com/sites/default/files/2023-06/Half-Pack-Sigma-Spec-Sheet.pdf", make: "Heil", model: "Half-Pack Sigma", equipment_class: "compactador", module: "REC", source_label: "Heil Half-Pack Sigma spec" },
  { url: "https://www.heil.com/sites/default/files/2023-06/Python-Spec-Sheet.pdf", make: "Heil", model: "Python", equipment_class: "compactador", module: "REC", source_label: "Heil Python spec" },
  // McNeilus
  { url: "https://www.mcneiluscompanies.com/-/media/mcneilus/files/brochures/atlantic-front-loader.pdf", make: "McNeilus", model: "Atlantic", equipment_class: "compactador", module: "REC", source_label: "McNeilus Atlantic FL brochure" },
  { url: "https://www.mcneiluscompanies.com/-/media/mcneilus/files/brochures/rear-loader.pdf", make: "McNeilus", model: "Rear Loader", equipment_class: "compactador", module: "REC", source_label: "McNeilus rear loader brochure" },
  // Labrie
  { url: "https://www.labriegroup.com/sites/default/files/2023-03/expert-rl-brochure.pdf", make: "Labrie", model: "Expert RL", equipment_class: "compactador", module: "REC", source_label: "Labrie Expert RL brochure" },
  // Wittke
  { url: "https://www.terexwittke.com/sites/default/files/2023-05/wittke-starlight-brochure.pdf", make: "Wittke", model: "Starlight", equipment_class: "compactador", module: "REC", source_label: "Wittke Starlight brochure" },
  // Pak-Mor
  { url: "https://www.pakmor.com/wp-content/uploads/2023/pak-mor-pacific-brochure.pdf", make: "Pak-Mor", model: "Pacific", equipment_class: "compactador", module: "REC", source_label: "Pak-Mor Pacific brochure" },
  // Loadmaster
  { url: "https://www.newwayrefuse.com/wp-content/uploads/2023/loadmaster-brochure.pdf", make: "New Way", model: "Loadmaster", equipment_class: "compactador", module: "REC", source_label: "New Way Loadmaster brochure" },

  // ═══════════════ LIM — Limpieza (barredoras) ═══════════════
  // Tennant
  { url: "https://docs.tennantco.com/m30-spec-sheet.pdf", make: "Tennant", model: "M30", equipment_class: "barredora", module: "LIM", source_label: "Tennant M30 sweeper spec" },
  { url: "https://docs.tennantco.com/m20-spec-sheet.pdf", make: "Tennant", model: "M20", equipment_class: "barredora", module: "LIM", source_label: "Tennant M20 sweeper spec" },
  { url: "https://docs.tennantco.com/m17-spec-sheet.pdf", make: "Tennant", model: "M17", equipment_class: "barredora", module: "LIM", source_label: "Tennant M17 sweeper spec" },
  // Nilfisk
  { url: "https://www.nilfisk.com/PageFiles/datasheets/SR-1601.pdf", make: "Nilfisk", model: "SR 1601", equipment_class: "barredora", module: "LIM", source_label: "Nilfisk SR1601 sweeper" },
  { url: "https://www.nilfisk.com/PageFiles/datasheets/SR-1900.pdf", make: "Nilfisk", model: "SR 1900", equipment_class: "barredora", module: "LIM", source_label: "Nilfisk SR1900 sweeper" },
  // Karcher
  { url: "https://media.kaercher.com/com/datasheets/KM-105-100-R-Bp.pdf", make: "Karcher", model: "KM 105/100 R Bp", equipment_class: "barredora", module: "LIM", source_label: "Karcher KM 105 sweeper" },
  { url: "https://media.kaercher.com/com/datasheets/MIC-50.pdf", make: "Karcher", model: "MIC 50", equipment_class: "barredora", module: "LIM", source_label: "Karcher MIC 50" },
  // Elgin (road sweepers)
  { url: "https://www.elginsweeper.com/sites/default/files/2023-08/pelican-brochure.pdf", make: "Elgin", model: "Pelican", equipment_class: "barredora", module: "LIM", source_label: "Elgin Pelican brochure" },
  { url: "https://www.elginsweeper.com/sites/default/files/2023-08/crosswind-brochure.pdf", make: "Elgin", model: "Crosswind", equipment_class: "barredora", module: "LIM", source_label: "Elgin Crosswind brochure" },
  { url: "https://www.elginsweeper.com/sites/default/files/2023-08/eagle-brochure.pdf", make: "Elgin", model: "Eagle", equipment_class: "barredora", module: "LIM", source_label: "Elgin Eagle brochure" },
  // Schwarze
  { url: "https://www.schwarze.com/wp-content/uploads/2023/A8-Twister-brochure.pdf", make: "Schwarze", model: "A8 Twister", equipment_class: "barredora", module: "LIM", source_label: "Schwarze A8 Twister brochure" },
  { url: "https://www.schwarze.com/wp-content/uploads/2023/S347-brochure.pdf", make: "Schwarze", model: "S347", equipment_class: "barredora", module: "LIM", source_label: "Schwarze S347 brochure" },
  // Tymco
  { url: "https://www.tymco.com/wp-content/uploads/2023/600-brochure.pdf", make: "Tymco", model: "600", equipment_class: "barredora", module: "LIM", source_label: "Tymco 600 brochure" },
  { url: "https://www.tymco.com/wp-content/uploads/2023/500x-brochure.pdf", make: "Tymco", model: "500x", equipment_class: "barredora", module: "LIM", source_label: "Tymco 500x brochure" },
  // Johnston (Bucher Municipal)
  { url: "https://www.buchermunicipal.com/-/media/files/sweepers/cn200-brochure.pdf", make: "Johnston", model: "CN200", equipment_class: "barredora", module: "LIM", source_label: "Johnston CN200 brochure" },
  { url: "https://www.buchermunicipal.com/-/media/files/sweepers/vt652-brochure.pdf", make: "Johnston", model: "VT652", equipment_class: "barredora", module: "LIM", source_label: "Johnston VT652 brochure" },
  // Hako
  { url: "https://www.hako.com/sites/default/files/2023-04/Citymaster-1650-spec.pdf", make: "Hako", model: "Citymaster 1650", equipment_class: "barredora", module: "LIM", source_label: "Hako Citymaster 1650 spec" },

  // ═══════════════ FUM — Fumigación ═══════════════
  // Curtis Dyna-Fog
  { url: "https://www.dynafog.com/sites/default/files/Trailblazer-spec.pdf", make: "Curtis Dyna-Fog", model: "Trailblazer", equipment_class: "fumigadora", module: "FUM", source_label: "Curtis Dyna-Fog Trailblazer spec" },
  { url: "https://www.dynafog.com/sites/default/files/Model-2505-spec.pdf", make: "Curtis Dyna-Fog", model: "2505", equipment_class: "fumigadora", module: "FUM", source_label: "Curtis Dyna-Fog 2505 spec" },
  // IGEBA
  { url: "https://www.igeba.de/sites/default/files/2023-05/IGEBA-TF-35-spec.pdf", make: "IGEBA", model: "TF-35", equipment_class: "fumigadora", module: "FUM", source_label: "IGEBA TF-35 spec" },
  { url: "https://www.igeba.de/sites/default/files/2023-05/IGEBA-TF-95-spec.pdf", make: "IGEBA", model: "TF-95", equipment_class: "fumigadora", module: "FUM", source_label: "IGEBA TF-95 spec" },
  // Buffalo Turbine
  { url: "https://buffaloturbine.com/wp-content/uploads/2023/MonsterMister-brochure.pdf", make: "Buffalo Turbine", model: "Monster Mister", equipment_class: "fumigadora", module: "FUM", source_label: "Buffalo Turbine Monster Mister brochure" },
  // Stihl
  { url: "https://www.stihlusa.com/WebContent/CMSFileLibrary/Brochures/SR430-brochure.pdf", make: "Stihl", model: "SR 430", equipment_class: "fumigadora", module: "FUM", source_label: "Stihl SR 430 brochure" },
  // B&G Equipment
  { url: "https://www.bgequip.com/wp-content/uploads/2023/AEROSOL-W-spec.pdf", make: "B&G Equipment", model: "AEROSOL-W", equipment_class: "fumigadora", module: "FUM", source_label: "B&G AEROSOL-W spec" },
  // Solo
  { url: "https://www.solo-international.com/-/media/files/brochures/solo-451-brochure.pdf", make: "Solo", model: "451", equipment_class: "fumigadora", module: "FUM", source_label: "Solo 451 backpack sprayer" },
  // Hudson
  { url: "https://hdhudson.com/wp-content/uploads/2023/super-sprayer-brochure.pdf", make: "Hudson", model: "Super Sprayer", equipment_class: "fumigadora", module: "FUM", source_label: "Hudson Super Sprayer brochure" },
  // Birchmeier
  { url: "https://www.birchmeier.com/sites/default/files/2023-06/IRIS-15-brochure.pdf", make: "Birchmeier", model: "IRIS 15", equipment_class: "fumigadora", module: "FUM", source_label: "Birchmeier IRIS 15 brochure" },
  // Vectorfog
  { url: "https://www.vectorfog.com/wp-content/uploads/2023/H100-spec.pdf", make: "Vectorfog", model: "H100", equipment_class: "fumigadora", module: "FUM", source_label: "Vectorfog H100 ULV spec" },
];

// Helper: lista deduplicada por url
export function uniqueOemSeeds(): OemSeed[] {
  const seen = new Set<string>();
  return OEM_SEEDS.filter(s => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
}

// Seeds filtrados por módulo
export function seedsByModule(module: "MTO" | "REC" | "LIM" | "FUM"): OemSeed[] {
  return OEM_SEEDS.filter(s => s.module === module);
}
