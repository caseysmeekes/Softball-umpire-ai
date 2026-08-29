export type RuleCategory='hard'|'soft'
export type TournamentRule={id:string;name:string;category:RuleCategory;description:string;defaultEnabled:boolean}
export const TOURNAMENT_RULES: TournamentRule[]=[
{id:'max-games',name:'Maximum 3 games per day',category:'hard',description:'An umpire cannot be automatically allocated to more than 3 games on the same day.',defaultEnabled:true},
{id:'plate-break',name:'Break after Plate',category:'hard',description:'After working Plate, the umpire must have the next scheduled game off.',defaultEnabled:true},
{id:'back-to-back',name:'Back-to-back Base → Plate',category:'hard',description:'If an umpire works consecutive scheduled games, the first must be Base and the second must be Plate.',defaultEnabled:true},
{id:'no-double-booking',name:'No double booking',category:'hard',description:'An umpire cannot be assigned to overlapping games.',defaultEnabled:true},
{id:'availability',name:'Umpire availability',category:'hard',description:'Only allocate an umpire during their declared availability.',defaultEnabled:true},
{id:'one-plate',name:'Prefer maximum 1 Plate per day',category:'soft',description:'Try to give each umpire no more than one Plate assignment per day. A second Plate is allowed with a warning when necessary.',defaultEnabled:true},
{id:'workload-balance',name:'Balance total workload',category:'soft',description:'Prefer umpires with fewer current games when all hard rules are satisfied.',defaultEnabled:true},
{id:'plate-balance',name:'Balance Plate assignments',category:'soft',description:'Prefer umpires with fewer Plate assignments across the tournament.',defaultEnabled:true},
{id:'field-continuity',name:'Prefer same field',category:'soft',description:'Prefer keeping an umpire on the same field for consecutive assignments where practical.',defaultEnabled:false},
{id:'experience-match',name:'Match experience to game level',category:'soft',description:'Prefer higher-experience umpires for higher-level games when experience data is available.',defaultEnabled:false},
{id:'pairing',name:'Umpire pairing preferences',category:'soft',description:'Prefer or avoid specified umpire pairings where tournament preferences are configured.',defaultEnabled:false},
{id:'finals-rest',name:'Finals / semi-final rest',category:'hard',description:'Optionally require a minimum game-off period before finals or other designated high-priority games.',defaultEnabled:false},
{id:'international-final',name:'International umpire for finals',category:'soft',description:'Prefer an International-grade umpire for designated finals when available.',defaultEnabled:false},
{id:'field-change',name:'Avoid consecutive field changes',category:'soft',description:'Prefer not to move an umpire between fields on consecutive games.',defaultEnabled:false},
]
export const DEFAULT_RULE_IDS=TOURNAMENT_RULES.filter(r=>r.defaultEnabled).map(r=>r.id)
