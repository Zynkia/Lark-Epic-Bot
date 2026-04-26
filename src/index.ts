import { fetchFreeGames } from './epic';
import { 
  cleanupExpiredGames, 
  saveGames, 
  getUnpushedGames, 
  markGamesAsPushed, 
  getCurrentFreeGames, 
  addSubscription, 
  removeSubscription, 
  getSubscriptions 
} from './db';
import { getTenantAccessToken, sendGamesCard, sendTextMessage } from './lark';

export interface Env {
  DB: D1Database;
  LARK_APP_ID: string;
  LARK_APP_SECRET: string;
  LARK_API_BASE: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduledTask(env));
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const payload = await request.json() as any;

      // Handle Lark Event Challenge
      if (payload.type === 'url_verification') {
        return Response.json({ challenge: payload.challenge });
      }

      // Handle Lark Messages
      if (payload.header?.event_type === 'im.message.receive_v1') {
        const event = payload.event;
        const msgType = event.message.message_type;
        
        if (msgType === 'text') {
          const content = JSON.parse(event.message.content);
          const text = content.text.trim().toLowerCase();
          const chatId = event.message.chat_id;
          const chatType = event.message.chat_type; // 'p2p' or 'group'
          
          ctx.waitUntil(handleCommand(text, chatId, chatType, env));
        }
      }

      return new Response('OK', { status: 200 });
    } catch (e) {
      console.error('Error handling webhook:', e);
      return new Response('Bad Request', { status: 400 });
    }
  }
};

async function runScheduledTask(env: Env) {
  const { DB, LARK_APP_ID, LARK_APP_SECRET, LARK_API_BASE } = env;

  console.log('Starting scheduled task...');
  
  // 1. Clean up expired games
  await cleanupExpiredGames(DB);

  // 2. Fetch new games
  const freeGames = await fetchFreeGames(LARK_API_BASE);
  if (freeGames.length > 0) {
    await saveGames(DB, freeGames);
  }

  // 3. Get unpushed games
  const unpushedGames = await getUnpushedGames(DB);
  if (unpushedGames.length === 0) {
    console.log('No new games to push.');
    return;
  }

  // 4. Get subscriptions
  const subscriptions = await getSubscriptions(DB);
  if (subscriptions.length === 0) {
    console.log('No subscriptions found.');
    // Mark as pushed anyway so we don't spam if someone subscribes later
    await markGamesAsPushed(DB, unpushedGames.map(g => g.id));
    return;
  }

  // 5. Send notifications
  const token = await getTenantAccessToken(LARK_APP_ID, LARK_APP_SECRET, LARK_API_BASE);
  if (!token) {
    console.error('Failed to get access token for scheduled push.');
    return;
  }

  for (const sub of subscriptions) {
    await sendGamesCard(unpushedGames, sub.chat_id, 'chat_id', token, LARK_API_BASE);
  }

  // 6. Mark games as pushed
  await markGamesAsPushed(DB, unpushedGames.map(g => g.id));
  console.log('Scheduled task completed.');
}

async function handleCommand(text: string, chatId: string, chatType: string, env: Env) {
  const { DB, LARK_APP_ID, LARK_APP_SECRET, LARK_API_BASE } = env;
  const isFeishu = LARK_API_BASE.includes('feishu.cn');

  const token = await getTenantAccessToken(LARK_APP_ID, LARK_APP_SECRET, LARK_API_BASE);
  if (!token) return;

  const isUnsubscribe = text.includes('unsubscribe') || text.includes('取消订阅');
  const isSubscribe = !isUnsubscribe && (text.includes('subscribe') || text.includes('订阅'));
  const isGames = text.includes('games') || text.includes('免费游戏');

  if (isSubscribe) {
    await addSubscription(DB, chatId, chatType);
    const msg = isFeishu ? '✅ 订阅成功！有新的 Epic 免费游戏时将为你推送。' : '✅ Subscribed successfully! You will be notified when new Epic free games are available.';
    await sendTextMessage(msg, chatId, 'chat_id', token, LARK_API_BASE);
  } else if (isUnsubscribe) {
    await removeSubscription(DB, chatId);
    const msg = isFeishu ? '❌ 取消订阅成功。' : '❌ Unsubscribed successfully.';
    await sendTextMessage(msg, chatId, 'chat_id', token, LARK_API_BASE);
  } else if (isGames) {
    const currentGames = await getCurrentFreeGames(DB);
    if (currentGames.length > 0) {
      await sendGamesCard(currentGames, chatId, 'chat_id', token, LARK_API_BASE);
    } else {
      const msg = isFeishu ? '当前没有正在免费的游戏。' : 'No free games available right now.';
      await sendTextMessage(msg, chatId, 'chat_id', token, LARK_API_BASE);
    }
  } else {
    const msg = isFeishu 
      ? '🤖 可用命令:\n- **订阅**: 有新游戏时接收推送\n- **取消订阅**: 停止接收推送\n- **免费游戏**: 查看当前的免费游戏' 
      : '🤖 Available Commands:\n- **subscribe**: Get notifications for new free games\n- **unsubscribe**: Stop notifications\n- **games**: Check current free games';
    await sendTextMessage(msg, chatId, 'chat_id', token, LARK_API_BASE);
  }
}
