import { EpicGame } from './epic';

export async function getTenantAccessToken(appId: string, appSecret: string, apiBase: string): Promise<string | null> {
  const url = `${apiBase.replace(/\/$/, '')}/open-apis/auth/v3/tenant_access_token/internal`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    });
    
    const data = await response.json() as any;
    if (data.code !== 0) {
      console.error('Failed to get tenant_access_token:', data.msg);
      return null;
    }
    return data.tenant_access_token;
  } catch (e) {
    console.error('Exception when getting tenant_access_token:', e);
    return null;
  }
}

function formatDate(dateString: string, isFeishu: boolean): string {
  try {
    const dateObj = new Date(dateString);
    if (isFeishu) {
      // Beijing time format
      const offsetMs = 8 * 60 * 60 * 1000;
      const bjDate = new Date(dateObj.getTime() + offsetMs);
      return bjDate.toISOString().replace('T', ' ').substring(0, 19);
    } else {
      return dateObj.toLocaleString('en-US', {
        month: 'long', day: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    }
  } catch (e) {
    return dateString;
  }
}

export async function sendGamesCard(games: EpicGame[], receiveId: string, receiveIdType: string, token: string, apiBase: string): Promise<boolean> {
  if (games.length === 0) return false;

  const url = `${apiBase.replace(/\/$/, '')}/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`;
  const isFeishu = apiBase.includes('feishu.cn');
  
  const headerTitle = isFeishu ? '🎉 Epic 免费游戏领取！' : '🎉 Epic Free Games Available!';
  const offerEndsText = isFeishu ? '截止时间' : 'Offer ends';

  const elements: any[] = [];
  
  games.forEach((game, index) => {
    const endDate = formatDate(game.end_date, isFeishu);
    const content = `**[${game.title}](${game.url})**\n**${offerEndsText}**: ${endDate}\n${game.description}`;
    
    elements.push({
      tag: 'div',
      text: { tag: 'lark_md', content }
    });
    
    if (index < games.length - 1) {
      elements.push({ tag: 'hr' });
    }
  });

  const card = {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: headerTitle },
      template: 'blue'
    },
    elements
  };

  const payload = {
    receive_id: receiveId,
    msg_type: 'interactive',
    content: JSON.stringify(card)
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json() as any;
    if (data.code !== 0) {
      console.error('Failed to send Lark message:', data.msg);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Exception when sending Lark message:', e);
    return false;
  }
}

export async function sendTextMessage(text: string, receiveId: string, receiveIdType: string, token: string, apiBase: string): Promise<boolean> {
  const url = `${apiBase.replace(/\/$/, '')}/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`;
  
  const payload = {
    receive_id: receiveId,
    msg_type: 'text',
    content: JSON.stringify({ text })
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json() as any;
    if (data.code !== 0) {
      console.error('Failed to send text message:', data.msg);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Exception when sending text message:', e);
    return false;
  }
}
