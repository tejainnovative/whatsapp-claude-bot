const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

const VERIFY_TOKEN = "mytoken123";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.sendStatus(403);
  }
});

app.post("/webhook", async (req, res) => {
  const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message || message.type !== "text") return res.sendStatus(200);

  const userMessage = message.text.body;
  const fromNumber = message.from;

  const claudeResponse = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are an AI assistant for an accident management firm. 
               You help triage messages, summarise updates, and draft replies 
               professionally. Be concise and helpful.`,
      messages: [{ role: "user", content: userMessage }],
    },
    {
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
    }
  );

  const reply = claudeResponse.data.content[0].text;

  await axios.post(
    `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: fromNumber,
      text: { body: reply },
    },
    {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    }
  );

  res.sendStatus(200);
});

app.listen(3000, () => console.log("Server running on port 3000"));
