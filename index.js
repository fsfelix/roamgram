const TelegramBotApi = require("node-telegram-bot-api");
const RoamApi = require("./clients/roam");
const AnkiApi = require("./clients/anki");

const main = async ({ token, adminId, roam: { graph, email, password } }) => {
  if (typeof adminId === "string") adminId = parseInt(adminId);

  const bot = new TelegramBotApi(token, { polling: true });
  const validator = (message) => {
    if (message.from.id == adminId) return true;
    return false;
  };
  const roam = new RoamApi(graph, email, password, {
    headless: true,
  });
  const anki = new AnkiApi();

  await roam.logIn();
  console.log("Logged into Roam");

  bot.onText(/\/id*(.+)/, (message) => {
    bot.sendMessage(
      message.chat.id,
      `User id: ${message.from.id}\nChat id: ${message.chat.id}`
    );
  });

  bot.on("polling_error", console.log);

  const CARD_REGEX = /\/card ({.+}) ({.+})/
  bot.onText(CARD_REGEX, (message) => {
    if (!validator(message)) {
      return;
    }

    const match = message.text.match(CARD_REGEX);
    const front = match[1].replace(/{|}/g, "")
    const back = match[2].replace(/{|}/g, "")

    anki.addCard(front, back)
      .then((res) => {
        if (res.error) {
          bot.sendMessage(message.chat.id, `Error adding the card: ${res.error}.`)
          return;
        }

        bot.sendMessage(message.chat.id, "Added the card!")
      });
  })

  bot.onText(/\/health/, (message) => {
    bot.sendMessage(
      message.chat.id,
      "Bot is up :)"
    );
  });

  bot.onText(/\/add (.+)/, (message) => {
    const chatId = message.chat.id;
    if (validator(message)) {
      const dailyNoteId = roam.dailyNoteUid();
      const dailyNoteTitle = roam.dailyNoteTitle();

      roam
        .runQuery(
          `[ :find (pull ?e [*]) :where [?e :node/title "${dailyNoteTitle}"]]`
        )
        .then((result) => {
          try {
            return result[0][0].children.length;
          } catch {
            return result[0].length;
          }
        })
        .then((order) => {
          roam
            .appendBlock(
              message.text.replace(/\/add /, ""),
              order ?? 0,
              dailyNoteId
            )
            .then((result) => {
              if (result) {
                bot.sendMessage(chatId, `Added text to Roam Daily Notes`);
              } else {
                bot.sendMessage(
                  chatId,
                  `Failed to add message to Roam Daily Notes`
                );
              }
            })
            .catch((err) => {
              bot.sendMessage(
                chatId,
                `Failed to add message to Roam Daily Notes.\n${err.toString()}`
              );
            });
        })
        .catch((err) => {
          bot.sendMessage(
            chatId,
            `Failed to add message to Roam Daily Notes.\n${err.toString()}`
          );
        });
    } else {
      console.log(message.from.id);
      bot.sendMessage(chatId, "Invalid user.");
    }
  });
};

module.exports = main;

require("dotenv").config();

(async () => {
  [
    "ROAM_GRAPH",
    "ROAM_EMAIL",
    "ROAM_PASSWORD",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_ADMIN_ID",
  ].forEach((key) => {
    if (!process.env[key]) {
      console.log(`${key} not found in env file.`);
      process.exit(1);
    }

    if (key === "TELEGRAM_ADMIN_ID") {
      if (typeof process.env[key] === "string")
        process.env[key] = parseInt(process.env[key]);
    }
  });

  await main({
    token: process.env.TELEGRAM_BOT_TOKEN,
    adminId: process.env.TELEGRAM_ADMIN_ID,
    roam: {
      graph: process.env.ROAM_GRAPH,
      email: process.env.ROAM_EMAIL,
      password: process.env.ROAM_PASSWORD,
    },
  });
})().catch((err) => console.log(err));
