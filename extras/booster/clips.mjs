/* Which pictures make up Booster: two stills, sitting and looking at you, and asleep. The other sheets and the smooth walk (source/walk)
   are kept in extras/booster/source for when she moves again; they are left out of the atlas so it stays small.
   scale = how much to multiply a sheet's pixels by, so she is the same size in both. */
export const SHEETS = {
    sit:     { rows: [3, 3], scale: 0.58 },
    sleep:   { rows: [5, 5], scale: 0.69 }
};
/* clip name: [sheet, first frame (1-based), how many] */
export const CLIPS = {
    sit_front: ['sit', 1, 1],
    sleep: ['sleep', 4, 1]
};
