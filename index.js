import axios from "axios";
import Twilio from "twilio";
import fs from "fs";

const client = Twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const DB_FILE = "notified_games.json";

let notifiedGames = [];
if (fs.existsSync(DB_FILE)) {
  try {
    notifiedGames = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch (e) { notifiedGames = []; }
}

async function sendWhatsApp(msg) {
  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.WHATSAPP_TO,
      body: msg,
    });
  } catch (error) { console.error("Error Twilio:", error.message); }
}

async function checkGames() {
  try {
    const res = await axios.get("https://www.gamerpower.com/api/giveaways?type=game");
    const games = res.data;

    console.log(`Juegos detectados por la API: ${games.length}`);
    let newNotifications = false;

    for (const g of games) {
      // Filtro mejorado: PC, Steam, Epic o Amazon
      const platformStr = g.platforms.toLowerCase();
      const isTargetPlatform = ["pc", "steam", "epic", "amazon"].some(p => platformStr.includes(p));
      
      // Filtro de precio: "N/A" o "100%" suelen indicar que es gratis
      const isFree = g.worth === "N/A" || g.worth.includes("100%");

      if (isTargetPlatform && isFree) {
        if (!notifiedGames.includes(g.id)) {
          console.log(`>> NOTIFICANDO: ${g.title} en ${g.platforms}`);
          await sendWhatsApp(`🎮 *JUEGO GRATIS EN ${g.platforms.toUpperCase()}*\n\n🎁 *${g.title}*\n\n🔗 Link: ${g.open_giveaway_url}`);
          
          notifiedGames.push(g.id);
          newNotifications = true;
        }
      }
    }

    // LIMPIEZA: Si el historial tiene más de 100 juegos, dejamos solo los 50 más nuevos
    if (notifiedGames.length > 30) {
      notifiedGames = notifiedGames.slice(-15);
    }

    if (newNotifications) {
      fs.writeFileSync(DB_FILE, JSON.stringify(notifiedGames));
      console.log("Historial actualizado en el repo.");
    } else {
      console.log("No hay novedades para notificarte.");
    }

  } catch (error) { console.error("Error en el bot:", error.message); }
}

checkGames();
