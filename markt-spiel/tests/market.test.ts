import { CATEGORY_IDS, isShelf } from '../src/market/data';
import { createPlayer, update, type Engine } from '../src/market/engine';
import {
  addStat,
  advanceStory,
  buy,
  capacity,
  claimBonus,
  claimLogin,
  claimQuest,
  completeTask,
  createSave,
  dailyOffers,
  dayKey,
  levelFor,
  makeQuests,
  migrate,
  refresh,
  seeded,
  STORY,
  weekKey,
  weeklyOffer,
} from '../src/market/logic';
import { CHECKOUTS, DIRS, isWalkable, MAP, MAP_H, MAP_W, queueSpot, STAFF, START, tileAt } from '../src/market/map';
import { createWorld, makeBestBefore, makeCheckout, makeQuestion, tickWorld } from '../src/market/world';

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
};

// --- Map ---------------------------------------------------------------------------------------
eq('map rows all equally wide', MAP.every((r) => r.length === MAP_W), true);
eq('start is walkable', isWalkable(START.x, START.y), true);
eq('four checkouts', CHECKOUTS.length, 4);
eq('queue spots walkable', CHECKOUTS.map((_, k) => isWalkable(queueSpot(k).x, queueSpot(k).y)), [true, true, true, true]);

// Everything you need to use must be reachable from the start.
const seen = new Set<string>();
const queue = [{ x: START.x, y: START.y }];
const blockedByStaff = (x: number, y: number) => STAFF.some((s) => s.x === x && s.y === y);
while (queue.length) {
  const p = queue.shift()!;
  const key = `${p.x},${p.y}`;
  if (seen.has(key)) continue;
  seen.add(key);
  for (const d of Object.values(DIRS)) {
    const n = { x: p.x + d.dx, y: p.y + d.dy };
    if (isWalkable(n.x, n.y) && !blockedByStaff(n.x, n.y)) queue.push(n);
  }
}
const reachable = (x: number, y: number) => Object.values(DIRS).some((d) => seen.has(`${x + d.dx},${y + d.dy}`));
const unreachable: string[] = [];
for (let y = 0; y < MAP_H; y++)
  for (let x = 0; x < MAP_W; x++) {
    const ch = tileAt(x, y);
    if ((isShelf(ch) || 'LZQMKP'.includes(ch)) && !reachable(x, y)) unreachable.push(`${ch}@${x},${y}`);
  }
eq('every shelf and machine can be reached', unreachable, []);
eq('every staff member can be talked to', STAFF.filter((s) => s.id !== 'bernd' && !reachable(s.x, s.y)).map((s) => s.id), []);
eq('the deli counter can be reached', reachable(3, 8), true);
eq('every department has a shelf', CATEGORY_IDS.every((c) => MAP.some((r) => r.includes(c))), true);

// --- Dates ---------------------------------------------------------------------------------------
const NOW = new Date(2026, 10, 6, 12, 0).getTime(); // Friday 6 Nov 2026
eq('day key', dayKey(NOW), '2026-11-06');
eq('iso week', weekKey(NOW), '2026-W45');
eq('monday starts a new week', weekKey(new Date(2026, 10, 9).getTime()), '2026-W46');
eq('sunday is still the same week', weekKey(new Date(2026, 10, 8).getTime()), '2026-W45');
eq('new year week', weekKey(new Date(2027, 0, 1).getTime()), '2026-W53');

// --- Quests --------------------------------------------------------------------------------------
eq('quests are the same for the same day', makeQuests('daily', '2026-11-06'), makeQuests('daily', '2026-11-06'));
eq('three distinct quest kinds', new Set(makeQuests('daily', '2026-11-06').map((q) => q.kind)).size, 3);
eq('different days, different quests', JSON.stringify(makeQuests('daily', '2026-11-06')) !== JSON.stringify(makeQuests('daily', '2026-11-07')), true);

let save = createSave(NOW);
eq('new save has daily and weekly quests', [save.daily.quests.length, save.weekly.quests.length], [3, 3]);
eq('refresh keeps the same day', refresh(save, NOW + 1000) === save, true);
eq('refresh rolls over at midnight', refresh(save, new Date(2026, 10, 7, 0, 1).getTime()).daily.key, '2026-11-07');

const q = save.daily.quests[0];
eq('cannot claim unfinished quest', claimQuest(save, 'daily', q.id).error, 'Noch nicht geschafft.');
let s2 = addStat(save, q.kind, q.target).save;
const claimed = claimQuest(s2, 'daily', q.id);
eq('claiming pays the reward', claimed.save.coins - s2.coins, q.coins);
eq('claimed quest is marked', claimed.save.daily.quests[0].claimed, true);
eq('cannot claim twice', claimQuest(claimed.save, 'daily', q.id).error, 'Schon abgeholt.');
eq('bonus needs all three', claimBonus(claimed.save, 'daily').error, 'Hol zuerst alle Quests ab.');
s2 = claimed.save;
for (const quest of s2.daily.quests.slice(1)) s2 = claimQuest(addStat(s2, quest.kind, quest.target).save, 'daily', quest.id).save;
const bonus = claimBonus(s2, 'daily');
eq('daily bonus pays 100', bonus.save.coins - s2.coins, 100);

// --- Tasks, levels, boosts -------------------------------------------------------------------------
eq('level 1 at 0 xp', levelFor(0).level, 1);
eq('level 2 at 50 xp', levelFor(50).level, 2);
eq('level 5 at 500 xp', levelFor(500).level, 5);
eq('level 10 at 2250 xp', levelFor(2250).level, 10);
const task = completeTask(save, 'checkout');
eq('checkout pays coins', task.save.coins - save.coins, 18);
eq('checkout counts', task.save.stats.checkout, 1);
eq('earned counts the coins', task.save.stats.earned, 18);
const fast = completeTask(save, 'checkout', 1.5);
eq('quick answers pay more', fast.coins, 27);
const boosted = completeTask({ ...save, boosts: { coins: 2, xp: 0 } }, 'restock');
eq('coffee doubles coins', boosted.coins, 16);
eq('coffee is used up', boosted.save.boosts.coins, 1);
eq('gold tag adds 10 %', completeTask({ ...save, owned: [...save.owned, 'goldschild'] }, 'spill').coins, 13);

// --- Badges --------------------------------------------------------------------------------------
const badge = addStat(save, 'restock', 50);
eq('badge after 50 restocks', badge.save.badges, ['regal']);
eq('badge pays 200', badge.save.coins - save.coins, 200);
eq('badge only once', addStat(badge.save, 'restock', 1).save.badges, ['regal']);

// --- Shop ----------------------------------------------------------------------------------------
const rich = { ...save, coins: 5000 };
const cart = buy(rich, { id: 'rollwagen', price: 150, discount: 0 }, Math.random);
eq('buying costs coins', cart.save.coins, 4850);
eq('rollwagen carries three', capacity(cart.save), 3);
eq('cannot buy twice', buy(cart.save, { id: 'rollwagen', price: 150, discount: 0 }, Math.random).error, 'Hast du schon.');
eq('hubwagen needs rollwagen', buy(rich, { id: 'hubwagen', price: 600, discount: 0 }, Math.random).error, 'Erst Rollwagen kaufen.');
eq('hubwagen carries six', capacity(buy(cart.save, { id: 'hubwagen', price: 600, discount: 0 }, Math.random).save), 6);
eq('not enough coins', buy({ ...save, coins: 10 }, { id: 'kaffee', price: 80, discount: 0 }, Math.random).error, 'Dir fehlen 70 Taler.');
const coffee = buy(rich, { id: 'kaffee', price: 80, discount: 0 }, Math.random);
eq('coffee gives 10 boosted tasks', coffee.save.boosts.coins, 10);
eq('consumables can be bought again', buy(coffee.save, { id: 'kaffee', price: 80, discount: 0 }, Math.random).save.boosts.coins, 20);
const offers = dailyOffers('2026-11-06');
eq('four daily offers', offers.length, 4);
eq('daily offers are discounted', offers.every((o) => o.discount > 0), true);
eq('daily offers are stable', dailyOffers('2026-11-06'), offers);
const daily = buy(rich, offers[0], Math.random, true);
eq('daily offer once per day', buy(daily.save, offers[0], Math.random, true).error !== undefined, true);
eq('weekly highlight is weekly-only', ['vest-gold', 'vest-rainbow', 'hat-crown'].includes(weeklyOffer('2026-W45').id), true);
const vest = buy(rich, { id: 'vest-blue', price: 120, discount: 0 }, Math.random);
eq('new vest is put on', vest.save.equipped.vest, 'vest-blue');
const keks = buy(rich, { id: 'keks', price: 60, discount: 0 }, () => 0.5);
eq('fortune cookie pays out', keks.save.coins, 5000 - 60 + 110);

// --- Login ---------------------------------------------------------------------------------------
const day1 = claimLogin(save, NOW);
eq('first login pays 20', day1.save.coins - save.coins, 20);
eq('second login same day pays nothing', claimLogin(day1.save, NOW + 3600000).save.coins, day1.save.coins);
const day2 = claimLogin(day1.save, NOW + 86400000);
eq('streak grows on the next day', day2.save.login.streak, 2);
eq('streak resets after a gap', claimLogin(day2.save, NOW + 4 * 86400000).save.login.streak, 1);

// --- Story ---------------------------------------------------------------------------------------
let story = save;
story = advanceStory(story, { type: 'locker' }).save;
eq('story waits for the right step', story.story, 0);
story = advanceStory(story, { type: 'talk', who: 'berger' }).save;
eq('talking to the manager starts the story', story.story, 1);
story = advanceStory(story, { type: 'locker' }).save;
eq('then the locker', story.story, 2);
story = completeTask(story, 'restock').save;
eq('restocking advances the story', story.story, 3);
const late = { ...save, story: 10 };
eq('promotion needs level 5', advanceStory(late, { type: 'talk', who: 'berger' }).save.story, 10);
eq('promotion at level 5', advanceStory({ ...late, xp: 500 }, { type: 'talk', who: 'berger' }).save.story, 11);
eq('story has an end', advanceStory({ ...save, story: STORY.length }, { type: 'talk', who: 'berger' }).save.story, STORY.length);

// --- Migration -----------------------------------------------------------------------------------
eq('migrate fills in missing stats', migrate({ coins: 7, stats: { restock: 3 } as never }, NOW).stats.spill, 0);
eq('migrate keeps coins', migrate({ coins: 7 }, NOW).coins, 7);

// --- Encounters ----------------------------------------------------------------------------------
const rand = seeded('test');
let checkoutsOk = true;
for (let i = 0; i < 200; i++) {
  const c = makeCheckout(rand);
  const sum = c.items.reduce((a, it) => a + it.cents, 0);
  if (sum !== c.total || c.paid - c.total !== c.answer || !c.options.includes(c.answer) || new Set(c.options).size !== 4 || c.options.some((o) => o <= 0))
    checkoutsOk = false;
}
eq('checkout change is right and options are distinct', checkoutsOk, true);
let questionsOk = true;
for (let i = 0; i < 100; i++) {
  const qq = makeQuestion(rand);
  if (!qq.options.includes(qq.category) || new Set(qq.options).size !== 4) questionsOk = false;
}
eq('question options contain the answer', questionsOk, true);
let mhdOk = true;
for (let i = 0; i < 100; i++) {
  const b = makeBestBefore(rand, NOW, 'k');
  const toDate = (d: string) => new Date(2026, Number(d.slice(3, 5)) - 1, Number(d.slice(0, 2))).getTime();
  const today = new Date(2026, 10, 6).getTime();
  b.items.forEach((it, k) => {
    if ((toDate(it.date) < today) !== (k === b.answer)) mhdOk = false;
  });
}
eq('exactly the answer is expired', mhdOk, true);

// --- World and movement ----------------------------------------------------------------------------
const player = createPlayer(START.x, START.y, START.dir);
const world = createWorld(NOW, seeded('w'), player);
eq('world starts with empty shelves', world.empty.size, 6);
eq('nobody spawns on the player', world.npcs.some((n) => n.x === player.x && n.y === player.y), false);
for (let t = 0; t < 600; t++) tickWorld(world, NOW + t * 1000, 1, seeded(`t${t}`), player);
eq('things to do appear over time', world.npcs.some((n) => n.kind === 'queue') && world.spills.size > 0, true);
eq('npcs only stand on walkable tiles', world.npcs.every((n) => isWalkable(n.x, n.y)), true);
eq('no two npcs share a tile', new Set(world.npcs.map((n) => `${n.x},${n.y}`)).size, world.npcs.length);
eq('pfand fills up', world.pfand, 100);

const engine: Engine = { world: createWorld(NOW, seeded('e'), createPlayer(17, 19, 'up')), player: createPlayer(17, 19, 'up'), held: 'up', running: false, frozen: false, fast: false, last: NOW, rand: seeded('e') };
engine.world.npcs = [];
update(engine, NOW + 10);
eq('holding the facing direction walks', [engine.player.x, engine.player.y], [17, 18]);
engine.held = 'left';
update(engine, NOW + 1000);
eq('a new direction from standing only turns', [engine.player.x, engine.player.dir], [17, 'left']);
update(engine, NOW + 1200);
eq('holding it then walks', engine.player.x, 16);
engine.frozen = true;
update(engine, NOW + 2000);
eq('frozen player stays put', engine.player.x, 16);

process.exit(fails ? 1 : 0);
