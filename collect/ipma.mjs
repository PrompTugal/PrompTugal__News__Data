// IPMA's open data (https://api.ipma.pt/open-data/, no key): the reference lists the IPMA collectors share.
export const IPMA = 'https://api.ipma.pt/open-data/'
// Algarve forecast places that are not district capitals (board/tools/local-now.mjs in PrompTugal__News__Website reads them)
export const EXTRA_CITIES = [{ id: 1080800, name: 'Loulé', area: 'FAR' }, { id: 1081100, name: 'Portimão', area: 'FAR' }, { id: 1081505, name: 'Sagres', area: 'FAR' }]
/** The district capitals and islands: globalIdLocal -> { name, area, lat, lon }. */
export async function places(run) {
    const j = await run.json('distrits-islands', IPMA + 'distrits-islands.json', { shared: true })
    const m = new Map()
    for (const d of j?.data || []) m.set(d.globalIdLocal, { name: d.local, area: d.idAreaAviso, lat: +d.latitude, lon: +d.longitude })
    for (const e of EXTRA_CITIES) if (!m.has(e.id)) m.set(e.id, { name: e.name, area: e.area, lat: null, lon: null })
    return m
}
export const AREA = { AVR: 'Aveiro', BJA: 'Beja', BRG: 'Braga', BGC: 'Bragança', CBO: 'Castelo Branco', CBR: 'Coimbra', EVR: 'Évora', FAR: 'Faro', GDA: 'Guarda', LRA: 'Leiria', LSB: 'Lisboa', PTG: 'Portalegre', PTO: 'Porto', STM: 'Santarém', STB: 'Setúbal', VCT: 'Viana do Castelo', VRL: 'Vila Real', VIS: 'Viseu',
    MCN: 'Madeira, north coast', MCS: 'Madeira, south coast', MRM: 'Madeira, mountain regions', MPS: 'Porto Santo', AOR: 'Azores, eastern group', ACE: 'Azores, central group', AOC: 'Azores, western group' }
