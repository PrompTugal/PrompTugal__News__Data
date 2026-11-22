// English Premier League: openfootball football.json, every season from 2010-11 (collect/football.mjs). Code, no model. data.d@PrompTugal.dinis.
import { collectLeague } from '../../collect/football.mjs'
export default run => collectLeague(run, { code: 'en.1', league: 'English Premier League', country: 'GB', place: 'london' })
