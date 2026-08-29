export const UMPIRE_COLOURS = ['#EAF4FF','#FCEFEF','#EEF8EE','#FFF7E6','#F3EEFF','#EAF9F6','#FFF0F5','#F1F4F6'] as const
export function umpireColour(index:number){return UMPIRE_COLOURS[index % UMPIRE_COLOURS.length]}
