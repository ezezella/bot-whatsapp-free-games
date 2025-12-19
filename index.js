import axios from "axios";
import Twilio from "twilio";
import fs from "fs";

const client = Twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const DB_FILE = "notified_games.json";

// 1. Cargar historial de juegos ya notificados
let notifiedGames = [];
if (fs.existsSync(DB_FILE)) {
  notifiedGames = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

async function sendWhatsApp(msg) {
  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.WHATSAPP_TO,
      body: msg,
    });
  } catch (error) {
    console.error("Error Twilio:", error.message);
  }
}

async function checkGames() {
  try {
    // Buscamos juegos de PC, Steam, Epic y Amazon
    const res = await axios.get("https://www.gamerpower.com/api/giveaways?type=game");
    const games = res.data;

    const platformsInteres = ["PC", "Epic Games Store", "Steam", "Amazon Prime"];
    let newNotifications = false;

    for (const g of games) {
      // Filtrar por plataformas y que sea 100% descuento
      if (g.status === "Active" && g.worth === "N/A" || g.worth.includes("100%")) {
        
        if (!notifiedGames.includes(g.id)) {
          console.log(`¡Nuevo juego encontrado!: ${g.title}`);
          
          await sendWhatsApp(`🎮 *JUEGO GRATIS EN ${g.platforms.toUpperCase()}*\n\n🎁 *${g.title}*\n\n🔗 Link: ${g.open_giveaway_url}`);
          
          notifiedGames.push(g.id);
          newNotifications = true;
        }
      }
    }

    // 2. Si hubo juegos nuevos, guardar el historial actualizado
    if (newNotifications) {
      fs.writeFileSync(DB_FILE, JSON.stringify(notifiedGames));
      console.log("Historial actualizado.");
    } else {
      console.log("No hay juegos nuevos desde la última revisión.");
    }

  } catch (error) {
    console.error("Error al obtener juegos:", error.message);
  }
}

checkGames();
