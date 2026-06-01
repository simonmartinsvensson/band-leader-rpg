// Central difficulty knobs. Tweak these to make the whole game easier/harder —
// balance lives here, not scattered across formulas. Higher-level effects:
//   - staminaMultiplier:  bigger HP pools -> fewer one-shots, longer fights.
//   - enemyDamageMultiplier: <1 means the player's party takes less damage.
//   - playerDamageMultiplier: >1 means the player's party hits harder.
//   - xpRewardMultiplier: >1 means the party levels faster.
//
// For a quick "make it easier" pass: lower enemyDamageMultiplier and/or raise
// staminaMultiplier + xpRewardMultiplier. The reverse makes it harder.
export const BALANCE = {
  staminaMultiplier: 1.6,
  playerDamageMultiplier: 1.1,
  enemyDamageMultiplier: 0.8,
  xpRewardMultiplier: 1.5,
};
