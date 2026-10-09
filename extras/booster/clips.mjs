/* Which frames make which clip, and how big each source sheet must be drawn so she is the same size in every clip.
   scale = how much to multiply a sheet's pixels by; found by matching her body across the sheets, and checked by eye in the preview. */
export const SHEETS = {
    walk:    { rows: [4, 4], scale: 1.00 },
    idle:    { rows: [4], scale: 0.71, key: 'black' },
    sit:     { rows: [3, 3], scale: 0.58 },
    look:    { rows: [3, 3], scale: 0.55 },
    groom:   { rows: [3, 3], scale: 0.54 },
    sleep:   { rows: [5, 5], scale: 0.69 },
    stretch: { rows: [5], scale: 0.57 },
    crouch:  { rows: [5], scale: 0.70, R: 1 },
    jump:    { rows: [6, 5, 5, 4], scale: 1.28 }
};
/* clip name: [sheet, first frame (1-based), how many] */
export const CLIPS = {
    walk: ['walk', 1, 8], idle: ['idle', 1, 4],
    sit_front: ['sit', 1, 3], sit_side: ['sit', 4, 3], look_up: ['look', 1, 3], look_down: ['look', 4, 3],
    groom: ['groom', 1, 6], lie: ['sleep', 1, 3], sleep: ['sleep', 4, 4], wake: ['sleep', 8, 3], stretch: ['stretch', 1, 5],
    crouch: ['crouch', 1, 3], ready: ['crouch', 4, 2],
    jump_up: ['jump', 6, 4], mid_jump: ['jump', 10, 4], jump_down: ['jump', 14, 4], land: ['jump', 18, 3]
};
