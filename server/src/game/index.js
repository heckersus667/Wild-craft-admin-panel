const which = process.env.GAME_ADAPTER || 'mock';
const mod = which === 'live' ? await import('./liveAdapter.js') : await import('./mockAdapter.js');
export const game = which === 'live' ? mod.liveAdapter : mod.mockAdapter;
console.log(`[game] using ${game.name} adapter`);
