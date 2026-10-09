/* Which pictures make up Booster: sitting and looking at you (3 frames: eyes open, a blink, a second look), grooming (lifts a paw and
   licks it), and asleep (4 frames of her breathing). The walking and the other sheets, and the smooth walk (source/walk), are kept in
   extras/booster/source for when she moves again; they are left out of the atlas so it stays small.
   scale = how much to multiply a sheet's pixels by, so she is the same size in every pose. */
export const SHEETS = {
    sit:     { rows: [3, 3], scale: 0.58 },
    groom:   { rows: [3, 3], scale: 0.54 },
    sleep:   { rows: [5, 5], scale: 0.69 }
};
/* clip name: [sheet, first frame (1-based), how many] */
export const CLIPS = {
    sit_front: ['sit', 1, 3],
    groom: ['groom', 1, 6],
    sleep: ['sleep', 4, 4]
};
