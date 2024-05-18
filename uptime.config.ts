const pageConfig = {
  // Title for your status page
  title: "HEALTH MONITOR",
  // Links shown at the header of your status page, could set `highlight` to `true`
  links: [
    { link: 'https://liuu.org', label: 'Blog' },
    { link: 'https://dl.btlcraft.top', label: 'DATABASE' },
    { link: 'mailto:kenneth@cookiejar.eu.org', label: 'Email Me', highlight: true },
  ],
}

const workerConfig = {
  // Write KV at most every 3 minutes unless the status changed.
  kvWriteCooldownMinutes: 3,
  // Define all your monitors here
  monitors: [
    // Example HTTP Monitor
    // Example TCP Monitor
    {
      id: 'Blog',
      name: 'Blog',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'TCP_PING',
      // `target` should be `host:port` for tcp monitors
      target: 'liuu.org',
      tooltip: 'Kenneth's Blog',
      statusPageLink: 'https://liuu.org',
      timeout: 5000,
    },
    {
      id: 'DATABASE',
      name: 'DATABASE',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'TCP_PING',
      // `target` should be `host:port` for tcp monitors
      target: 'dl.btlcraft.top',
      tooltip: 'Kenneth's Blog',
      statusPageLink: 'https://dl.btlcraft.top',
      timeout: 5000,
    },
    {
      id: 'HK',
      name: 'Hong Kong',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'TCP_PING',
      // `target` should be `host:port` for tcp monitors
      target: 'hk.btlcraft.top',
      tooltip: 'Hong Kong',
    //statusPageLink: 'https://dl.btlcraft.top',
      timeout: 5000,
    },
    {
      id: 'US',
      name: 'United States',
      // `method` should be `TCP_PING` for tcp monitors
      method: 'TCP_PING',
      // `target` should be `host:port` for tcp monitors
      target: 'us-west.btlcraft.top',
      tooltip: 'United States',
    //statusPageLink: 'https://us-west.btlcraft.top',
      timeout: 5000,
    },
  ],
  callbacks: {
    onStatusChange: async (
      env: any,
      monitor: any,
      isUp: boolean,
      timeIncidentStart: number,
      timeNow: number,
      reason: string
    ) => {
      // This callback will be called when there's a status change for any monitor
      // Write any Typescript code here

      // By default, this sends Bark and Telegram notification on every status change if you setup Cloudflare env variables correctly.
      await notify(env, monitor, isUp, timeIncidentStart, timeNow, reason)
    },
    onIncident: async (
      env: any,
      monitor: any,
      timeIncidentStart: number,
      timeNow: number,
      reason: string
    ) => {
      // This callback will be called EVERY 1 MINTUE if there's an on-going incident for any monitor
      // Write any Typescript code here
    },
  },
}

// Below is code for sending Telegram & Bark notification
// You can safely ignore them
const escapeMarkdown = (text: string) => {
  return text.replace(/[_*[\](){}~`>#+\-=|.!\\]/g, '\\$&');
};

async function notify(
  env: any,
  monitor: any,
  isUp: boolean,
  timeIncidentStart: number,
  timeNow: number,
  reason: string,
) {
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'numeric',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  });

  let downtimeDuration = Math.round((timeNow - timeIncidentStart) / 60);
  const timeIncidentStartFormatted = dateFormatter.format(new Date(timeIncidentStart * 1000));
  let statusText = isUp
    ? `The service is up again after being down for ${downtimeDuration} minutes.`
    : `Service became unavailable at ${timeIncidentStartFormatted}. Issue: ${reason || 'unspecified'}`;

  console.log('Notifying: ', monitor.name, statusText);

  if (env.BARK_SERVER && env.BARK_DEVICE_KEY) {
    try {
      let title = isUp ? `✅ ${monitor.name} is up again!` : `🔴 ${monitor.name} is currently down.`;
      await sendBarkNotification(env, monitor, title, statusText);
    } catch (error) {
      console.error('Error sending Bark notification:', error);
    }
  }

  if (env.SECRET_TELEGRAM_CHAT_ID && env.SECRET_TELEGRAM_API_TOKEN) {
    try {
      let operationalLabel = isUp ? 'Up' : 'Down';
      let statusEmoji = isUp ? '✅' : '🔴';
      let telegramText = `*${escapeMarkdown(
        monitor.name,
      )}* is currently *${operationalLabel}*\n${statusEmoji} ${escapeMarkdown(statusText)}`;
      await notifyTelegram(env, monitor, isUp, telegramText);
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
    }
  }
}

export async function notifyTelegram(env: any, monitor: any, operational: boolean, text: string) {
  const chatId = env.SECRET_TELEGRAM_CHAT_ID;
  const apiToken = env.SECRET_TELEGRAM_API_TOKEN;

  const payload = new URLSearchParams({
    chat_id: chatId,
    parse_mode: 'MarkdownV2',
    text: text,
  });

  try {
    const response = await fetch(`https://api.telegram.org/bot${apiToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload.toString(),
    });

    if (!response.ok) {
      console.error(
        `Failed to send Telegram notification "${text}",  ${response.status} ${response.statusText
        } ${await response.text()}`,
      );
    }
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}

async function sendBarkNotification(env: any, monitor: any, title: string, body: string, group: string = '') {
  const barkServer = env.BARK_SERVER;
  const barkDeviceKey = env.BARK_DEVICE_KEY;
  const barkUrl = `${barkServer}/push`;
  const data = {
    title: title,
    body: body,
    group: group,
    url: monitor.url,
    device_key: barkDeviceKey,
  };

  const response = await fetch(barkUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (response.ok) {
    console.log('Bark notification sent successfully.');
  } else {
    const respText = await response.text();
    console.error('Failed to send Bark notification:', response.status, response.statusText, respText);
  }
}

// Don't forget this, otherwise compilation fails.
export { pageConfig, workerConfig }
